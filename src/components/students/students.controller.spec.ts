import { Test, TestingModule } from '@nestjs/testing';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { UsersService } from '../users/users.service';
import { StudentsRepository } from './students.repository';
import { SchoolsService } from '../schools';
import { CounterService } from '../../common/counter';
import { PoliciesGuard } from '../roles-manager/policies/policies.guard';
import { RoleManagerFactory } from '../roles-manager/role-manager.factory';

describe('StudentsController', () => {
  let controller: StudentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [
        StudentsService,
        {
          provide: UsersService,
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: StudentsRepository,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findOneByStudentNo: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: SchoolsService,
          useValue: {
            getSchoolById: jest.fn(),
          },
        },
        {
          provide: CounterService,
          useValue: {
            getNextSequenceNo: jest.fn(),
          },
        },
        {
          provide: PoliciesGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: RoleManagerFactory,
          useValue: {
            createUserPermissions: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StudentsController>(StudentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
