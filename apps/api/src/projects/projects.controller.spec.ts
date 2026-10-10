import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  const projectsServiceMock = {
    create: jest.fn(),
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
});
