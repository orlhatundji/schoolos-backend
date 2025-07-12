import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { Repository } from '../../common/base-repository';

@Injectable()
export class UsersRepository extends Repository<
  User,
  Prisma.UserDelegate,
  Prisma.UserWhereInput,
  Prisma.UserWhereUniqueInput,
  Prisma.UserUncheckedCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserInclude
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.user);
  }
}
