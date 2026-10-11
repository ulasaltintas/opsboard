import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const projectsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: projectsServiceMock,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should pass the user, organization, and DTO to the service', async () => {
    const request = {
      user: {
        sub: 'user-123',
        email: 'owner@example.com',
        role: 'MEMBER',
      },
    };

    const organizationId = 'org-123';

    const dto = {
      name: 'Website Redesign',
      description: 'Redesign the company website',
    };

    const createdProject = {
      id: 'project-123',
      organizationId,
      ...dto,
    };

    projectsServiceMock.create.mockResolvedValue(createdProject);

    const result = await controller.create(
      request as Parameters<ProjectsController['create']>[0],
      organizationId,
      dto,
    );

    expect(projectsServiceMock.create).toHaveBeenCalledWith(
      'user-123',
      organizationId,
      dto,
    );

    expect(result).toEqual(createdProject);
  });

  it('should pass the user and organization IDs to findAll', async () => {
    const request = {
      user: {
        sub: 'user-123',
        email: 'member@example.com',
        role: 'MEMBER',
      },
    };

    const organizationId = 'org-123';

    const projects = [
      {
        id: 'project-123',
        name: 'Website Redesign',
        organizationId,
      },
    ];

    projectsServiceMock.findAll.mockResolvedValue(projects);

    const result = await controller.findAll(
      request as Parameters<ProjectsController['findAll']>[0],
      organizationId,
    );

    expect(projectsServiceMock.findAll).toHaveBeenCalledWith(
      'user-123',
      organizationId,
    );

    expect(result).toEqual(projects);
  });

  it('should pass the user, organization, and project IDs to findOne', async () => {
    const request = {
      user: {
        sub: 'user-123',
        email: 'member@example.com',
        role: 'MEMBER',
      },
    };

    const organizationId = 'org-123';
    const projectId = 'project-123';

    const project = {
      id: projectId,
      name: 'Website Redesign',
      organizationId,
    };

    projectsServiceMock.findOne.mockResolvedValue(project);

    const result = await controller.findOne(
      request as Parameters<ProjectsController['findOne']>[0],
      organizationId,
      projectId,
    );

    expect(projectsServiceMock.findOne).toHaveBeenCalledWith(
      'user-123',
      organizationId,
      projectId,
    );

    expect(result).toEqual(project);
  });

  it('should pass the correct arguments to update', async () => {
    const request = {
      user: {
        sub: 'user-123',
        email: 'owner@example.com',
        role: 'MEMBER',
      },
    };

    const organizationId = 'org-123';
    const projectId = 'project-123';

    const dto = {
      name: 'Website Redesign v2',
    };

    const updatedProject = {
      id: projectId,
      organizationId,
      name: dto.name,
    };

    projectsServiceMock.update.mockResolvedValue(updatedProject);

    const result = await controller.update(
      request as Parameters<ProjectsController['update']>[0],
      organizationId,
      projectId,
      dto,
    );

    expect(projectsServiceMock.update).toHaveBeenCalledWith(
      'user-123',
      organizationId,
      projectId,
      dto,
    );

    expect(result).toEqual(updatedProject);
  });

  it('should pass the correct arguments to remove', async () => {
    const request = {
      user: {
        sub: 'user-123',
        email: 'owner@example.com',
        role: 'MEMBER',
      },
    };

    const organizationId = 'org-123';
    const projectId = 'project-123';

    const deletedProject = {
      id: projectId,
      organizationId,
      name: 'Temporary Test Project',
    };

    projectsServiceMock.remove.mockResolvedValue(deletedProject);

    const result = await controller.remove(
      request as Parameters<ProjectsController['remove']>[0],
      organizationId,
      projectId,
    );

    expect(projectsServiceMock.remove).toHaveBeenCalledWith(
      'user-123',
      organizationId,
      projectId,
    );

    expect(result).toEqual(deletedProject);
  });
});
