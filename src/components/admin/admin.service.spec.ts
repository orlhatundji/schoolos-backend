import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { ResetPasswordService } from '../auth/modules/reset-password/reset-password.service';

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: ResetPasswordService,
          useValue: {
            resetUserPassword: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
