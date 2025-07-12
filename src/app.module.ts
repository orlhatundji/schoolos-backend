import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './utils';
import { AccessTokenGuard } from './components/auth/strategies/jwt/guards';
import { AppModuleList } from './app-module.list';
import { Encryptor } from './utils/encryptor';
import { HealthController } from './health.controller';

@Module({
  imports: AppModuleList,
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    Encryptor,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
