import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Repository } from '../../common/base-repository';
import { Prisma, AssessmentStructure } from '@prisma/client';

@Injectable()
export class AssessmentStructureRepository extends Repository<
  AssessmentStructure,
  Prisma.AssessmentStructureDelegate,
  Prisma.AssessmentStructureWhereInput,
  Prisma.AssessmentStructureWhereUniqueInput,
  Prisma.AssessmentStructureUncheckedCreateInput,
  Prisma.AssessmentStructureUpdateInput,
  Prisma.AssessmentStructureInclude
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.assessmentStructure);
  }
}
