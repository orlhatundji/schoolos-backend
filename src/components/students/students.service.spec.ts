import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CounterService } from '../../common/counter';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentTermService } from '../../shared/services/current-term.service';
import { MailQueueService } from '../../utils/mail-queue/mail-queue.service';
import { PasswordGenerator } from '../../utils/password/password.generator';
import { SchoolsService } from '../schools';
import { UsersService } from '../users/users.service';
import { ClassArmStudentService } from './services/class-arm-student.service';
import { StudentsRepository } from './students.repository';
import { StudentsService } from './students.service';

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    student: { update: jest.Mock };
    classArmStudent: { updateMany: jest.Mock };
    rawPrisma: { student: { findFirst: jest.Mock } };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      student: { update: jest.fn() },
      classArmStudent: { updateMany: jest.fn() },
      rawPrisma: { student: { findFirst: jest.fn() } },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: UsersService, useValue: { save: jest.fn(), update: jest.fn() } },
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
            count: jest.fn(),
          },
        },
        { provide: SchoolsService, useValue: { getSchoolById: jest.fn() } },
        { provide: CounterService, useValue: { getNextSequenceNo: jest.fn() } },
        { provide: PrismaService, useValue: prisma },
        { provide: PasswordGenerator, useValue: { generate: jest.fn() } },
        {
          provide: ClassArmStudentService,
          useValue: { transferStudent: jest.fn(), removeStudentFromClassArm: jest.fn() },
        },
        { provide: MailQueueService, useValue: { addWelcomeEmail: jest.fn() } },
        { provide: CurrentTermService, useValue: { getCurrentTermWithSession: jest.fn() } },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('remove (soft delete)', () => {
    it('throws BadRequestException when actor has no school', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.remove('actor-id', 'student-id')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws NotFoundException when student is not in actor school', async () => {
      prisma.user.findUnique.mockResolvedValue({ schoolId: 'school-1' });
      prisma.rawPrisma.student.findFirst.mockResolvedValue(null);
      await expect(service.remove('actor-id', 'student-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('is idempotent when student already deleted', async () => {
      const deletedAt = new Date('2026-01-01');
      prisma.user.findUnique.mockResolvedValue({ schoolId: 'school-1' });
      prisma.rawPrisma.student.findFirst.mockResolvedValue({
        id: 'student-id',
        userId: 'user-id',
        deletedAt,
      });
      const res = await service.remove('actor-id', 'student-id');
      expect(res).toEqual({ id: 'student-id', alreadyDeleted: true, deletedAt });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('soft deletes student, user, and active enrollments in a transaction', async () => {
      prisma.user.findUnique.mockResolvedValue({ schoolId: 'school-1' });
      prisma.rawPrisma.student.findFirst.mockResolvedValue({
        id: 'student-id',
        userId: 'user-id',
        deletedAt: null,
      });

      const res = await service.remove('actor-id', 'student-id');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 'student-id' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(prisma.classArmStudent.updateMany).toHaveBeenCalledWith({
        where: { studentId: 'student-id', isActive: true },
        data: { isActive: false, leftAt: expect.any(Date), deletedAt: expect.any(Date) },
      });
      expect(res.id).toBe('student-id');
      expect(res.deletedAt).toBeInstanceOf(Date);
    });
  });
});
