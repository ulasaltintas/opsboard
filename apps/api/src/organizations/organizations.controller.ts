import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '../../generated/prisma/enums';
import { AuthGuard } from '../auth/auth.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: Role;
  };
}

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an organization' })
  @ApiCreatedResponse({ description: 'Organization created successfully' })
  @ApiConflictResponse({ description: 'Organization slug already exists' })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createOrganizationDto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(
      request.user.sub,
      createOrganizationDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List organizations for the current user' })
  @ApiOkResponse({ description: 'Organizations returned successfully' })
  findAll(@Req() request: AuthenticatedRequest) {
    return this.organizationsService.findAllForUser(request.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organization by ID' })
  @ApiOkResponse({ description: 'Organization returned successfully' })
  @ApiNotFoundResponse({ description: 'Organization was not found' })
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.organizationsService.findOneForUser(request.user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an organization' })
  @ApiOkResponse({ description: 'Organization updated successfully' })
  @ApiNotFoundResponse({ description: 'Organization was not found' })
  @ApiForbiddenResponse({
    description: 'Insufficient organization permissions',
  })
  @ApiConflictResponse({
    description: 'Organization slug already exists',
  })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(
      request.user.sub,
      id,
      updateOrganizationDto,
    );
  }
  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to an organization' })
  @ApiCreatedResponse({ description: 'Member added successfully' })
  @ApiNotFoundResponse({ description: 'Organization or user was not found' })
  @ApiForbiddenResponse({
    description: 'Insufficient organization permissions',
  })
  @ApiConflictResponse({
    description: 'User is already a member of the organization',
  })
  addMember(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.organizationsService.addMember(
      request.user.sub,
      id,
      addMemberDto,
    );
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List organization members' })
  @ApiOkResponse({ description: 'Organization members returned successfully' })
  @ApiNotFoundResponse({ description: 'Organization was not found' })
  getMembers(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.organizationsService.getMembers(request.user.sub, id);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update an organization member role' })
  @ApiOkResponse({ description: 'Member role updated successfully' })
  @ApiForbiddenResponse({
    description: 'Only the organization owner can change member roles',
  })
  @ApiNotFoundResponse({
    description: 'Organization or member was not found',
  })
  updateMemberRole(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
  ) {
    return this.organizationsService.updateMemberRole(
      request.user.sub,
      id,
      userId,
      updateMemberRoleDto,
    );
  }
  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from an organization' })
  @ApiOkResponse({ description: 'Member removed successfully' })
  @ApiForbiddenResponse({
    description: 'Insufficient organization permissions',
  })
  @ApiNotFoundResponse({
    description: 'Organization or member was not found',
  })
  removeMember(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.organizationsService.removeMember(request.user.sub, id, userId);
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({ summary: 'Transfer organization ownership' })
  @ApiOkResponse({
    description: 'Organization ownership transferred successfully',
  })
  @ApiBadRequestResponse({
    description: 'The current owner cannot transfer ownership to themselves',
  })
  @ApiForbiddenResponse({
    description: 'Only the organization owner can transfer ownership',
  })
  @ApiNotFoundResponse({
    description: 'Organization or target member was not found',
  })
  transferOwnership(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() transferOwnershipDto: TransferOwnershipDto,
  ) {
    return this.organizationsService.transferOwnership(
      request.user.sub,
      id,
      transferOwnershipDto,
    );
  }
}
