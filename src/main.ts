import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { StrategyEnum } from './components/auth/strategies';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  await app.listen(process.env.PORT || 3000, () =>
    console.log(`\nApp here: http://localhost:3000/ \n\nDocs here: http://localhost:3000/docs`),
  );
}
bootstrap();
