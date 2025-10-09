import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { StrategyEnum } from './components/auth/strategies';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const corsOptions: CorsOptions = {
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  if (process.env.NODE_ENV === 'production') {
    // Allow all subdomains of schos.ng in production
    corsOptions.origin = (origin, callback) => {
      if (!origin || origin.endsWith('.schos.ng') || origin === 'https://schos.ng') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    };
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
    .setTitle('SchoolOS Portal')
    .setDescription('The SchoolOS API Documentation')
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
