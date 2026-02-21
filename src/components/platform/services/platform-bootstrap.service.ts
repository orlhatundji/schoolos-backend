import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../../prisma/prisma.service';
import { PasswordHasher } from '../../../utils/hasher/hasher';
import { UserTypes } from '../../users/constants';

@Injectable()
export class PlatformBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlatformBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasher,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensurePlatformAdmin();
  }

  private async ensurePlatformAdmin() {
    const email = this.configService.get<string>('platformAdmin.email');
    const password = this.configService.get<string>('platformAdmin.password');
    const firstName = this.configService.get<string>('platformAdmin.firstName');
    const lastName = this.configService.get<string>('platformAdmin.lastName');

    if (!email || !password) {
      this.logger.warn('Platform admin email or password not configured, skipping bootstrap');
      return;
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email,
        type: UserTypes.SYSTEM_ADMIN,
      },
      include: { systemAdmin: true },
    });

    if (existingUser?.systemAdmin) {
      this.logger.log(`Platform admin already exists (${email})`);
      return;
    }

    // If the user exists but has no systemAdmin record, create the record
    if (existingUser && !existingUser.systemAdmin) {
      await this.prisma.systemAdmin.create({
        data: {
          userId: existingUser.id,
          role: 'PLATFORM_ADMIN',
        },
      });
      this.logger.log(`Platform admin record created for existing user (${email})`);
      return;
    }

    // Create user + system admin
    const hashedPassword = await this.passwordHasher.hash(password);

    const user = await this.prisma.user.create({
      data: {
        type: UserTypes.SYSTEM_ADMIN,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        gender: 'MALE',
      },
    });

    await this.prisma.systemAdmin.create({
      data: {
        userId: user.id,
        role: 'PLATFORM_ADMIN',
      },
    });

    this.logger.log(`Platform admin created (${email})`);
  }
}
