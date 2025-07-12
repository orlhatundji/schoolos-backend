import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Repository } from '../../common/base-repository';
import { Prisma, AssessmentComponent } from '@prisma/client';

@Injectable()
export class AssessmentComponentRepository extends Repository<
  AssessmentComponent,
  Prisma.AssessmentComponentDelegate,
  Prisma.AssessmentComponentWhereInput,
  Prisma.AssessmentComponentWhereUniqueInput,
  Prisma.AssessmentComponentUncheckedCreateInput,
  Prisma.AssessmentComponentUpdateInput,
  Prisma.AssessmentComponentInclude
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.assessmentComponent);
  }
}
