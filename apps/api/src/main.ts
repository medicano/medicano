import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { loadAwsSecrets } from './common/config/aws-secrets.loader';

async function bootstrap(): Promise<void> {
  const secrets = await loadAwsSecrets();
  Object.assign(process.env, secrets);

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors();

  const port = process.env.PORT ?? 3000;

  await app.listen(port);

  Logger.log(`Application running on port ${port}`, 'Bootstrap');
}

bootstrap();
