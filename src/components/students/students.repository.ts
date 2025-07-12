import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Repository } from '../../common/base-repository';
import { Student } from './types';
import { Prisma } from '@prisma/client';
import { CounterService } from '../../common/counter';

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
      include: { user: true },
    });
  }

  async findOneWithIncludes(id: string): Promise<Student> {
    return this.findOne({
      where: { id },
      include: {
        user: true,
      },
    });
  }
}
