import { Module } from '@nestjs/common';
import { JwtAuthModule } from './strategies/jwt/jwt-auth.module';
import { AuthService } from './auth.service';
import { PasswordHasher } from '../../utils/hasher';
import { Encryptor } from '../../utils/encryptor';
import { UsersModule } from '../users/users.module';
import { StudentsModule } from '../students/students.module';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { TokensService } from './modules/refresh-token/tokens.service';
import { TokensRepository } from './modules/refresh-token/tokens.repository';
import { RefershTokensController } from './modules/refresh-token/refresh-tokens.controller';
import { OtpGenerator } from '../../utils/otp-generator';
import { ResetPasswordService } from './modules/reset-password/reset-password.service';
import { ResetPasswordController } from './modules/reset-password/reset-password.controller';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../../utils/mail/mail.module';
import { PasswordGenerator } from '../../utils/password/password.generator';

@Module({
  imports: [JwtAuthModule, UsersModule, StudentsModule, PrismaModule, MailModule, ConfigModule],
  providers: [
    AuthService,
    PasswordHasher,
    Encryptor,
    TokensService,
    TokensRepository,
    ResetPasswordService,
    OtpGenerator,
    PasswordGenerator,
  ],
  controllers: [AuthController, RefershTokensController, ResetPasswordController],
  exports: [ResetPasswordService],
})
export class AuthModule {}
