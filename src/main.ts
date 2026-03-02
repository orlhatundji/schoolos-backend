import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { StrategyEnum } from './components/auth/strategies';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.useBodyParser('json', { limit: '1mb' });
  const corsOptions: CorsOptions = {
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
  console.log('\n\nEnvironment\n\n');
  console.log(process.env.NODE_ENV);

  if (process.env.NODE_ENV === 'production') {
    corsOptions.origin = [
      'https://api.schos.ng',
      'https://admin.schos.ng',
      'https://teacher.schos.ng',
      'https://student.schos.ng',
      'https://www.schos.ng',
      'https://platform.schos.ng',
    ];
  } else if (process.env.NODE_ENV === 'staging') {
    console.log('\n\nStaging environment\n\n');
    console.log(process.env.NODE_ENV);
    corsOptions.origin = [
      '*',
      'https://devapi.schos.ng',
      'https://schos-admin.netlify.app',
      'https://schos-teacher.netlify.app',
      'https://schos-student.netlify.app',
      'https://schos-website.netlify.app',
      'https://schos-platform.netlify.app',
    ];
  } else {
    // Allow localhost in development
    corsOptions.origin = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:8080',
    ];
  }

  app.enableCors(corsOptions);

  // Set global API prefix for consistency, but exclude webhook routes
  app.setGlobalPrefix('api', {
    exclude: ['webhooks/paystack'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Schos Portal')
    .setDescription('The Schos API Documentation')
    .setVersion('0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: StrategyEnum.JWT_REFRESH,
      },
      StrategyEnum.JWT_REFRESH, // This name is important to differentiate from the access token
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: StrategyEnum.JWT },
      StrategyEnum.JWT,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 8080);
}
bootstrap();
