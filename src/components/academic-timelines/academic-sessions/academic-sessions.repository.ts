import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Repository } from '../../../common/base-repository';
import { AcademicSession } from './types';
import { Prisma } from '@prisma/client';

@Injectable()
export class AcademicSessionsRepository extends Repository<
  AcademicSession,
  Prisma.AcademicSessionDelegate,
  Prisma.AcademicSessionWhereInput,
  Prisma.AcademicSessionWhereUniqueInput,
  Prisma.AcademicSessionUncheckedCreateInput,
  Prisma.AcademicSessionUpdateInput,
  Prisma.AcademicSessionInclude
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.academicSession);
  }
}
