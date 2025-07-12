import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademicSessionsRepository } from './academic-sessions.repository';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';
import { AcademicSessionMessages } from './results/messages';
import { AcademicSession } from './types';
import { BaseService } from '../../../common/base-service';

@Injectable()
export class AcademicSessionsService extends BaseService {
  constructor(private readonly academicSessionsRepository: AcademicSessionsRepository) {
    super(AcademicSessionsService.name);
  }

  async createAcademicSession(dto: CreateAcademicSessionDto): Promise<AcademicSession> {
    return this.academicSessionsRepository.create(dto);
  }

  async getAcademicSessionById(id: string): Promise<AcademicSession> {
    const academicSession = await this.academicSessionsRepository.findById(id);

    if (!academicSession) {
      throw new NotFoundException(AcademicSessionMessages.FAILURE.SESSION_NOT_FOUND);
    }

    return academicSession;
  }

  async getAllAcademicSessions(): Promise<AcademicSession[]> {
    return this.academicSessionsRepository.findAll();
  }

  async updateAcademicSession(
    id: string,
    data: UpdateAcademicSessionDto,
  ): Promise<AcademicSession> {
    await this.getAcademicSessionById(id);
    return this.academicSessionsRepository.update({ id }, data);
  }

  async deleteAcademicSession(id: string): Promise<AcademicSession> {
    await this.getAcademicSessionById(id);
    return this.academicSessionsRepository.delete({ id });
  }
}
