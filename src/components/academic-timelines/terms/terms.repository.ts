import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Repository } from '../../../common/base-repository';
import { Term } from './types';
import { Prisma } from '@prisma/client';

@Injectable()
export class TermsRepository extends Repository<
  Term,
  Prisma.TermDelegate,
  Prisma.TermWhereInput,
  Prisma.TermWhereUniqueInput,
  Prisma.TermUncheckedCreateInput,
  Prisma.TermUpdateInput,
  Prisma.TermInclude
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.term);
  }
}
