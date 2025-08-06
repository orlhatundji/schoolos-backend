import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Repository } from '../../../common/base-repository';
import { Prisma, SchoolSignupRequest } from '@prisma/client';
import { SchoolSignupRequestWithReviewer } from './types';

@Injectable()
export class SchoolSignupRepository extends Repository<
  SchoolSignupRequest,
  Prisma.SchoolSignupRequestDelegate,
  Prisma.SchoolSignupRequestWhereInput,
  Prisma.SchoolSignupRequestWhereUniqueInput,
  Prisma.SchoolSignupRequestUncheckedCreateInput,
  Prisma.SchoolSignupRequestUpdateInput,
  Prisma.SchoolSignupRequestInclude
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.schoolSignupRequest);
  }

  async findOneW(id: string): Promise<SchoolSignupRequestWithReviewer | null> {
    return this.findOne({
      where: { id },
      include: {
        reviewer: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    }) as Promise<SchoolSignupRequestWithReviewer | null>;
  }

  async findOneBySchoolCode(schoolCode: string): Promise<SchoolSignupRequest | null> {
    return this.findOne({
      where: { schoolCode },
    });
  }

  async findAllWithReviewer(params?: {
    where?: Prisma.SchoolSignupRequestWhereInput;
    orderBy?: Prisma.SchoolSignupRequestOrderByWithRelationInput;
    take?: number;
  }): Promise<SchoolSignupRequestWithReviewer[]> {
    return this.findAll({
      where: params?.where,
      include: {
        reviewer: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: params?.orderBy,
      take: params?.take,
    }) as Promise<SchoolSignupRequestWithReviewer[]>;
  }
} 