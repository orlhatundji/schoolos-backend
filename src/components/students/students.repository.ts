import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { Repository } from '../../common/base-repository';
import { CounterService } from '../../common/counter';
import { PrismaService } from '../../prisma/prisma.service';
import { Student, StudentWithIncludes } from './types';

@Injectable()
export class StudentsRepository extends Repository<
  Student,
  Prisma.StudentDelegate,
  Prisma.StudentWhereInput,
  Prisma.StudentWhereUniqueInput,
  Prisma.StudentUncheckedCreateInput,
  Prisma.StudentUpdateInput,
  Prisma.StudentInclude
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counterService: CounterService,
  ) {
    super(prisma.student);
  }

  findOneByStudentNo(studentNo: string): Promise<Student> {
    return this.findOne({
      where: { studentNo },
      include: {
        user: {
          include: {
            school: true,
          },
        },
      },
    });
  }

  async findOneWithIncludes(id: string): Promise<Student> {
    return this.findOne({
      where: { id },
      include: {
        user: true,
        classArm: {
          include: {
            level: true,
            school: true,
          },
        },
        guardian: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async count(params?: { where?: Prisma.StudentWhereInput }): Promise<number> {
    return this.prisma.student.count(params);
  }

  async findAll(params?: {
    where?: Prisma.StudentWhereInput;
    include?: Prisma.StudentInclude;
    orderBy?: Prisma.StudentOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }): Promise<Student[]> {
    return this.prisma.student.findMany({
      where: params?.where,
      include: params?.include,
      orderBy: params?.orderBy,
      take: params?.take,
      skip: params?.skip,
    });
  }

  async findAllWithIncludes(params?: {
    where?: Prisma.StudentWhereInput;
    orderBy?: Prisma.StudentOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }): Promise<StudentWithIncludes[]> {
    return this.prisma.student.findMany({
      where: params?.where,
      include: {
        user: true,
        classArm: {
          include: {
            level: true,
            school: true,
          },
        },
        guardian: {
          include: {
            user: true,
          },
        },
      },
      orderBy: params?.orderBy,
      take: params?.take,
      skip: params?.skip,
    }) as Promise<StudentWithIncludes[]>;
  }
}
