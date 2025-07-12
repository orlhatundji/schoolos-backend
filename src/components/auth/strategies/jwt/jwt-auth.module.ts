import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthService } from './jwt-auth.service';
import { JwtAuthStrategy } from './jwt-auth.strategy';
import { RefreshTokenStrategy } from './refresh-token.strategy';
import { UsersModule } from '../../../users/users.module';
import { PasswordHasher } from '../../../../utils/hasher';
import { Encryptor } from '../../../../utils/encryptor';

@Module({
  imports: [JwtModule.register({}), UsersModule],
  providers: [JwtAuthService, JwtAuthStrategy, RefreshTokenStrategy, PasswordHasher, Encryptor],
  exports: [JwtAuthService],
})
export class JwtAuthModule {}
