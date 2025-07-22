import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Repository } from '../../common/base-repository';
import { Prisma, Assessment } from '@prisma/client';

@Injectable()
export class AssessmentRepository extends Repository<
  Assessment,
  Prisma.AssessmentDelegate,
  Prisma.AssessmentWhereInput,
  Prisma.AssessmentWhereUniqueInput,
  Prisma.AssessmentUncheckedCreateInput,
  Prisma.AssessmentUpdateInput,
  Prisma.AssessmentInclude
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.assessment);
  }
}
