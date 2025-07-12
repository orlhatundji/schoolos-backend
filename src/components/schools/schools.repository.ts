import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Repository } from '../../common/base-repository';
import { School } from './types';
import { Prisma } from '@prisma/client';

@Injectable()
export class SchoolsRepository extends Repository<
  School,
  Prisma.SchoolDelegate,
  Prisma.SchoolWhereInput,
  Prisma.SchoolWhereUniqueInput,
  Prisma.SchoolUncheckedCreateInput,
  Prisma.SchoolUpdateInput,
  Prisma.SchoolInclude
> {
  static readonly includes: Prisma.SchoolInclude = {
    levels: true,
    subjects: true,
    gradingModel: true,
    academicSessions: true,
    departments: true,
    counters: true,
    users: true,
  };

  constructor(private readonly prisma: PrismaService) {
    super(prisma.school);
  }

  findOneByCode(code: string): Promise<School | null> {
    return this.findOne({ where: { code } });
  }

  findOneByIdWithIncludes(id: string): Promise<School | null> {
    return this.findOne({
      where: { id },
      include: SchoolsRepository.includes,
    });
  }

  findOneByCodeWithIncludes(code: string): Promise<School | null> {
    return this.findOne({
      where: { code },
      include: SchoolsRepository.includes,
    });
  }
}
