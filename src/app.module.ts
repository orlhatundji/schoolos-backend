import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AppModuleList } from './app-module.list';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccessTokenGuard } from './components/auth/strategies/jwt/guards';
import { HealthController } from './health.controller';
import { Encryptor } from './utils/encryptor';
import { AllExceptionsFilter } from './utils/exception-filter';

@Module({
  imports: [
    ...AppModuleList,
    BullModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    Encryptor,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
