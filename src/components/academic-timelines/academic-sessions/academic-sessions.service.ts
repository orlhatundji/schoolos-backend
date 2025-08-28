import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AcademicSessionsRepository } from './academic-sessions.repository';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';
import { AcademicSessionMessages } from './results/messages';
import { AcademicSession } from './types';
import { BaseService } from '../../../common/base-service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AcademicSessionsService extends BaseService {
  constructor(
    private readonly academicSessionsRepository: AcademicSessionsRepository,
    private readonly prisma: PrismaService,
  ) {
    super(AcademicSessionsService.name);
  }

  async createAcademicSession(userId: string, dto: CreateAcademicSessionDto): Promise<AcademicSession> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school. Only school users can create academic sessions.');
    }

    // Add schoolId to the DTO
    const dataWithSchoolId = {
      ...dto,
      schoolId: user.schoolId,
    };

    return this.academicSessionsRepository.create(dataWithSchoolId);
  }

  async getAcademicSessionById(userId: string, id: string): Promise<AcademicSession> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school. Only school users can view academic sessions.');
    }

    const academicSession = await this.academicSessionsRepository.findOne({
      where: { 
        id,
        schoolId: user.schoolId,
      },
    });

    if (!academicSession) {
      throw new NotFoundException(AcademicSessionMessages.FAILURE.SESSION_NOT_FOUND);
    }

    return academicSession;
  }

  async getAllAcademicSessions(userId: string): Promise<AcademicSession[]> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school. Only school users can view academic sessions.');
    }

    return this.academicSessionsRepository.findAll({
      where: { schoolId: user.schoolId },
    });
  }

  async updateAcademicSession(
    userId: string,
    id: string,
    data: UpdateAcademicSessionDto,
  ): Promise<AcademicSession> {
    await this.getAcademicSessionById(userId, id);
    return this.academicSessionsRepository.update({ id }, data);
  }

  async deleteAcademicSession(userId: string, id: string): Promise<AcademicSession> {
    await this.getAcademicSessionById(userId, id);
    
    // Check if academic session has associated subject terms with student enrollments
    const subjectTerms = await this.prisma.subjectTerm.findMany({
      where: { academicSessionId: id },
      include: {
        subjectTermStudents: true,
      },
    });

    // Check if any subject terms have student enrollments
    for (const subjectTerm of subjectTerms) {
      if (subjectTerm.subjectTermStudents.length > 0) {
        throw new BadRequestException('Cannot delete academic session. It has associated student enrollments. Please remove all student enrollments first.');
      }
    }

    return this.academicSessionsRepository.delete({ id });
  }
}
