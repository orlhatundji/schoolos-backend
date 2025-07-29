import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service';
import { UsersService } from '../users/users.service';
import { StudentsRepository } from './students.repository';
import { SchoolsService } from '../schools';
import { CounterService } from '../../common/counter';

describe('StudentsService', () => {
  let service: StudentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
