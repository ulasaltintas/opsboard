import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { Role } from '../../generated/prisma/enums';
import { AuthGuard } from '../auth/auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsService } from './projects.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: Role;
  };
}

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('organizations/:organizationId/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiCreatedResponse({
    description: 'The project has been successfully created.',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to create a project.',
  })
  @ApiNotFoundResponse({
    description:
      'The specified organization was not found or user is not a member.',
  })
  create(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId') organizationId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(
      request.user.sub,
      organizationId,
      createProjectDto,
    );
  }
}
