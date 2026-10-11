import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { OrganizationRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    organizationId: string,
    createProjectDto: CreateProjectDto,
  ) {
    //check whether user belongs to the organization
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    //do not reveal organizations to outsiders
    if (!membership) {
      throw new NotFoundException(
        `Organization with ID: "${organizationId}" not found`,
      );
    }

    //only owner and admins can create projects
    if (
      membership.role !== OrganizationRole.OWNER &&
      membership.role !== OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException(
        `You do not have permission to create projects`,
      );
    }

    //create the project
    return this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
        organizationId,
      },
    });
  }

  async findAll(userId: string, organizationId: string) {
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
        `Organization with ID: "${organizationId}" not found`,
      );
    }

    return this.prisma.project.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(userId: string, organizationId: string, projectId: string) {
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
        `Organization with ID: "${organizationId}" not found`,
      );
    }

    //find the project, but only inside this organization
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException(
        `Project with ID: "${projectId}" not found in organization with ID: "${organizationId}"`,
      );
    }

    return project;
  }

  async update(
    userId: string,
    organizationId: string,
    projectId: string,
    updateProjectDto: UpdateProjectDto,
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
        `Organization with ID: "${organizationId}" not found`,
      );
    }

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException(
        `Project with ID: "${projectId}" not found in organization with ID: "${organizationId}"`,
      );
    }

    if (
      membership.role !== OrganizationRole.OWNER &&
      membership.role !== OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException(
        `You do not have permission to update projects`,
      );
    }

    return this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        ...(updateProjectDto.name !== undefined && {
          name: updateProjectDto.name,
        }),
        ...(updateProjectDto.description !== undefined && {
          description: updateProjectDto.description,
        }),
      },
    });
  }
}
