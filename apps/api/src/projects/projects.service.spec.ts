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
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
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
  describe('findAll', () => {
    const projects = [
      {
        id: 'project-2',
        name: 'Mobile App',
        organizationId,
      },
      {
        id: 'project-1',
        name: 'Website Redesign',
        organizationId,
      },
    ];

    it.each([
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.MEMBER,
    ])('should allow %s to list projects', async (role) => {
      prismaMock.membership.findUnique.mockResolvedValue({
        role,
      });

      prismaMock.project.findMany.mockResolvedValue(projects);

      const result = await service.findAll(userId, organizationId);

      expect(result).toEqual(projects);

      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should reject an outsider with 404', async () => {
      prismaMock.membership.findUnique.mockResolvedValue(null);

      await expect(service.findAll(userId, organizationId)).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaMock.project.findMany).not.toHaveBeenCalled();
    });

    it('should return an empty array when there are no projects', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        role: OrganizationRole.MEMBER,
      });

      prismaMock.project.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId, organizationId);

      expect(result).toEqual([]);
    });

    it('should check membership for the correct organization', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        role: OrganizationRole.OWNER,
      });

      prismaMock.project.findMany.mockResolvedValue(projects);

      await service.findAll(userId, organizationId);

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

  describe('findOne', () => {
    const projectId = 'project-123';

    const project = {
      id: projectId,
      name: 'Website Redesign',
      description: 'Redesign the company website',
      organizationId,
    };

    it.each([
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
      OrganizationRole.MEMBER,
    ])('should allow %s to view a project', async (role) => {
      prismaMock.membership.findUnique.mockResolvedValue({
        role,
      });

      prismaMock.project.findFirst.mockResolvedValue(project);

      const result = await service.findOne(userId, organizationId, projectId);

      expect(result).toEqual(project);

      expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: projectId,
          organizationId,
        },
      });
    });

    it('should reject outsiders with 404', async () => {
      prismaMock.membership.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(userId, organizationId, projectId),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.project.findFirst).not.toHaveBeenCalled();
    });

    it('should return 404 when the project does not exist', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        role: OrganizationRole.MEMBER,
      });

      prismaMock.project.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(userId, organizationId, projectId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return 404 when the project belongs to another organization', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        role: OrganizationRole.OWNER,
      });

      // The scoped query doesn't find a project in this organization.
      prismaMock.project.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(userId, organizationId, projectId),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: projectId,
          organizationId,
        },
      });
    });

    it('should check membership for the correct user and organization', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        role: OrganizationRole.OWNER,
      });

      prismaMock.project.findFirst.mockResolvedValue(project);

      await service.findOne(userId, organizationId, projectId);

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

  describe('update', () => {
    const projectId = 'project-123';

    const existingProject = {
      id: projectId,
      name: 'Website Redesign',
      description: 'Original description',
      organizationId,
    };

    it.each([OrganizationRole.OWNER, OrganizationRole.ADMIN])(
      'should allow %s to update a project',
      async (role) => {
        prismaMock.membership.findUnique.mockResolvedValue({
          role,
        });

        prismaMock.project.findFirst.mockResolvedValue(existingProject);

        const dto = {
          name: 'Website Redesign v2',
        };

        const updatedProject = {
          ...existingProject,
          name: dto.name,
        };

        prismaMock.project.update.mockResolvedValue(updatedProject);

        const result = await service.update(
          userId,
          organizationId,
          projectId,
          dto,
        );

        expect(result).toEqual(updatedProject);

        expect(prismaMock.project.update).toHaveBeenCalledWith({
          where: {
            id: projectId,
          },
          data: {
            name: 'Website Redesign v2',
          },
        });
      },
    );

    it('should reject a MEMBER with 403', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        role: OrganizationRole.MEMBER,
      });

      prismaMock.project.findFirst.mockResolvedValue(existingProject);

      await expect(
        service.update(userId, organizationId, projectId, {
          name: 'Unauthorized update',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.project.update).not.toHaveBeenCalled();
    });

    it('should reject outsiders with 404', async () => {
      prismaMock.membership.findUnique.mockResolvedValue(null);

      await expect(
        service.update(userId, organizationId, projectId, {
          name: 'Unauthorized update',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.project.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.project.update).not.toHaveBeenCalled();
    });

    it('should return 404 when the project does not exist', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        role: OrganizationRole.OWNER,
      });

      prismaMock.project.findFirst.mockResolvedValue(null);

      await expect(
        service.update(userId, organizationId, projectId, {
          name: 'New name',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.project.update).not.toHaveBeenCalled();
    });

    it('should prevent updates across organizations', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        role: OrganizationRole.ADMIN,
      });

      // The project is not found within the requested organization.
      prismaMock.project.findFirst.mockResolvedValue(null);

      await expect(
        service.update(userId, organizationId, projectId, {
          name: 'New name',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: projectId,
          organizationId,
        },
      });

      expect(prismaMock.project.update).not.toHaveBeenCalled();
    });

    it('should leave the description unchanged when omitted', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        role: OrganizationRole.OWNER,
      });

      prismaMock.project.findFirst.mockResolvedValue(existingProject);
      prismaMock.project.update.mockResolvedValue(existingProject);

      await service.update(userId, organizationId, projectId, {
        name: 'Updated project name',
      });

      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: {
          id: projectId,
        },
        data: {
          name: 'Updated project name',
        },
      });
    });

    it('should allow clearing the description with null', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        role: OrganizationRole.OWNER,
      });

      prismaMock.project.findFirst.mockResolvedValue(existingProject);

      prismaMock.project.update.mockResolvedValue({
        ...existingProject,
        description: null,
      });

      const result = await service.update(userId, organizationId, projectId, {
        description: null,
      });

      expect(result.description).toBeNull();

      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: {
          id: projectId,
        },
        data: {
          description: null,
        },
      });
    });
  });
});
