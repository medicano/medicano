import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { loadSecrets } from './common/config/secrets.loader';

async function bootstrap(): Promise<void> {
  await loadSecrets();

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.use(cookieParser());

  // Docker manda SIGTERM no `docker compose down/up`: fecha Mongo e Redis limpo.
  app.enableShutdownHooks();

  // credentials: true é obrigatório para o browser enviar/receber o cookie de
  // sessão. Com credenciais o Allow-Origin não pode ser '*': refletimos a origem
  // (ou a allowlist de CORS_ORIGIN, se definida no secret).
  const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;

  await app.listen(port);

  Logger.log(`Application running on port ${port}`, 'Bootstrap');
}

bootstrap();
