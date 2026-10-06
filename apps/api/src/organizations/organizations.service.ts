import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { OrganizationRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createOrganizationDto: CreateOrganizationDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: createOrganizationDto.name,
            slug: createOrganizationDto.slug,
          },
        });

        await tx.membership.create({
          data: {
            userId,
            organizationId: organization.id,
            role: OrganizationRole.OWNER,
          },
        });

        return organization;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'An organization with this slug already exists',
          );
        }
      }
      throw error;
    }
  }

  findAllForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        memberships: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
      },
    });
  }

  async findOneForUser(userId: string, organizationId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        memberships: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            role: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID "${organizationId}" was not found`,
      );
    }

    return organization;
  }

  async update(
    userId: string,
    organizationId: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        `Organization with ID "${organizationId}" was not found`,
      );
    }

    if (
      membership.role !== OrganizationRole.OWNER &&
      membership.role !== OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this organization',
      );
    }

    try {
      return await this.prisma.organization.update({
        where: {
          id: organizationId,
        },
        data: updateOrganizationDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An organization with this slug already exists',
        );
      }

      throw error;
    }
  }

  async addMember(
    requesterUserId: string,
    organizationId: string,
    addMemberDto: AddMemberDto,
  ) {
    const requesterMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: requesterUserId,
          organizationId,
        },
      },
    });

    if (!requesterMembership) {
      throw new NotFoundException(
        `Organization with ID "${organizationId}" was not found`,
      );
    }

    if (requesterMembership.role === OrganizationRole.MEMBER) {
      throw new ForbiddenException('You do not have permission to add members');
    }

    if (addMemberDto.role === OrganizationRole.OWNER) {
      throw new ForbiddenException(
        'OWNER role cannot be assigned through this endpoint',
      );
    }

    if (
      requesterMembership.role === OrganizationRole.ADMIN &&
      addMemberDto.role === OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only organization owners can add administrators',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: {
        email: addMemberDto.email,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException(
        `User with email "${addMemberDto.email}" was not found`,
      );
    }

    try {
      const membership = await this.prisma.membership.create({
        data: {
          userId: targetUser.id,
          organizationId,
          role: addMemberDto.role,
        },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return membership;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This user is already a member of the organization',
        );
      }

      throw error;
    }
  }

  async getMembers(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        `Organization with ID "${organizationId}" was not found`,
      );
    }

    const members = await this.prisma.membership.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return members;
  }

  async updateMemberRole(
    requesterUserId: string,
    organizationId: string,
    targetUserId: string,
    updateMemberRoleDto: UpdateMemberRoleDto,
  ) {
    // Check the person making the request
    const requesterMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: requesterUserId,
          organizationId,
        },
      },
    });

    if (!requesterMembership) {
      throw new NotFoundException(
        `Organization with ID "${organizationId}" was not found`,
      );
    }

    // Only the organization's OWNER can change roles
    if (requesterMembership.role !== OrganizationRole.OWNER) {
      throw new ForbiddenException(
        'Only the organization owner can change member roles',
      );
    }

    // OWNER cannot be assigned through this endpoint
    if (updateMemberRoleDto.role === OrganizationRole.OWNER) {
      throw new ForbiddenException(
        'OWNER role cannot be assigned through this endpoint',
      );
    }

    // Find the member whose role we want to change
    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('User is not a member of this organization');
    }

    return this.prisma.membership.update({
      where: {
        id: targetMembership.id,
      },
      data: {
        role: updateMemberRoleDto.role,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async removeMember(
    requesterUserId: string,
    organizationId: string,
    targetUserId: string,
  ) {
    const requesterMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: requesterUserId,
          organizationId,
        },
      },
    });

    if (!requesterMembership) {
      throw new NotFoundException(
        `Organization with ID "${organizationId}" was not found`,
      );
    }

    if (requesterMembership.role === OrganizationRole.MEMBER) {
      throw new ForbiddenException(
        'You do not have permission to remove members',
      );
    }

    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('User is not a member of this organization');
    }

    if (targetMembership.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('The organization owner cannot be removed');
    }

    if (
      requesterMembership.role === OrganizationRole.ADMIN &&
      targetMembership.role === OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only the organization owner can remove administrators',
      );
    }

    await this.prisma.membership.delete({
      where: {
        id: targetMembership.id,
      },
    });

    return {
      message: 'Member removed successfully',
    };
  }
}
