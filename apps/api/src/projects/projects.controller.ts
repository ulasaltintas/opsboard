import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
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

  @Get()
  @ApiOperation({ summary: 'List all projects for an organization' })
  @ApiOkResponse({
    description: 'The projects have been successfully retrieved.',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to view projects.',
  })
  @ApiNotFoundResponse({
    description: 'Organization not found or user is not a member',
  })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId') organizationId: string,
  ) {
    return this.projectsService.findAll(request.user.sub, organizationId);
  }

  @Get(':projectId')
  @ApiOperation({
    summary: 'Get a single project by ID',
  })
  @ApiOkResponse({
    description: 'Project retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Organization or project not found',
  })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.findOne(
      request.user.sub,
      organizationId,
      projectId,
    );
  }
}
