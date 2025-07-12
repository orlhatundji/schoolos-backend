import { Injectable, NotFoundException } from '@nestjs/common';
import { SchoolsRepository } from './schools.repository';
import { School } from '@prisma/client';
import { CreateSchoolDto } from './dto/create-school.dto';
import { SchoolMessages } from './results/messages';

@Injectable()
export class SchoolsService {
  constructor(private readonly schoolsRepository: SchoolsRepository) {}

  async createSchool(data: CreateSchoolDto): Promise<School> {
    return this.schoolsRepository.create(data);
  }

  async getSchoolById(id: string): Promise<School> {
    const school = await this.schoolsRepository.findById(id);
    if (!school) throw new NotFoundException(SchoolMessages.FAILURE.SCHOOL_NOT_FOUND);
    return school;
  }

  async getSchoolByCode(code: string): Promise<School> {
    const school = await this.schoolsRepository.findOneByCode(code);
    if (!school) throw new NotFoundException(SchoolMessages.FAILURE.SCHOOL_NOT_FOUND);
    return school;
  }
}
