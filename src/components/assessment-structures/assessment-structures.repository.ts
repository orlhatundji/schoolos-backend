import { Injectable } from '@nestjs/common';
import { AssessmentStructure, Prisma } from '@prisma/client';

import { Repository } from '../../common/base-repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssessmentStructuresRepository extends Repository<
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
