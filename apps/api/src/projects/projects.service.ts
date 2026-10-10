import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { OrganizationRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

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
}
