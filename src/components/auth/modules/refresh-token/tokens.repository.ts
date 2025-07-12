import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma, UserToken } from '@prisma/client';

@Injectable()
export class TokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(params: { data: Prisma.UserTokenCreateInput }): Promise<UserToken> {
    const { data } = params;
    return this.prisma.userToken.create({ data });
  }

  find(params: { where: Prisma.UserTokenWhereInput }): Promise<UserToken> {
    const { where } = params;
    return this.prisma.userToken.findFirst({ where });
  }

  update(params: {
    where: Prisma.UserTokenWhereUniqueInput;
    data: Prisma.UserTokenUpdateInput;
  }): Promise<UserToken> {
    const { where, data } = params;
    return this.prisma.userToken.update({ where, data });
  }

  upsert(params: {
    where: Prisma.UserTokenWhereUniqueInput;
    create: Prisma.UserTokenCreateInput;
    update: Prisma.UserTokenUpdateInput;
  }): Promise<UserToken> {
    const { where, create, update } = params;
    return this.prisma.userToken.upsert({ where, create, update });
  }
}
