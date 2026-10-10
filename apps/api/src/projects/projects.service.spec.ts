import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const prismaMock = {
    membership: {
      findUnique: jest.fn(),
    },
    project: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  const userId = 'user-123';
  const organizationId = 'org-123';

  const dto = {
    name: 'Website Redesign',
    description: 'Redesign the company website',
  };

  it('should create a project when the user is OWNER', async () => {
    prismaMock.membership.findUnique.mockResolvedValue({
      role: OrganizationRole.OWNER,
    });

    const createdProject = {
      id: 'project-123',
      organizationId,
      ...dto,
    };

    prismaMock.project.create.mockResolvedValue(createdProject);

    const result = await service.create(userId, organizationId, dto);

    expect(result).toEqual(createdProject);

    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: {
        name: dto.name,
        description: dto.description,
        organizationId,
      },
    });
  });

  it('should create a project when the user is ADMIN', async () => {
    prismaMock.membership.findUnique.mockResolvedValue({
      role: OrganizationRole.ADMIN,
    });

    prismaMock.project.create.mockResolvedValue({
      id: 'project-456',
      organizationId,
      ...dto,
    });

    await service.create(userId, organizationId, dto);

    expect(prismaMock.project.create).toHaveBeenCalledTimes(1);
  });

  it('should reject a MEMBER with 403', async () => {
    prismaMock.membership.findUnique.mockResolvedValue({
      role: OrganizationRole.MEMBER,
    });

    await expect(service.create(userId, organizationId, dto)).rejects.toThrow(
      ForbiddenException,
    );

    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });

  it('should reject an outsider with 404', async () => {
    prismaMock.membership.findUnique.mockResolvedValue(null);

    await expect(service.create(userId, organizationId, dto)).rejects.toThrow(
      NotFoundException,
    );

    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });

  it('should check membership for the correct user and organization', async () => {
    prismaMock.membership.findUnique.mockResolvedValue({
      role: OrganizationRole.OWNER,
    });

    prismaMock.project.create.mockResolvedValue({
      id: 'project-789',
      organizationId,
      ...dto,
    });

    await service.create(userId, organizationId, dto);

    expect(prismaMock.membership.findUnique).toHaveBeenCalledWith({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  });
});
