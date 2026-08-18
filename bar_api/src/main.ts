import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { requestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');
  const corsOrigins = configService
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configService.getOrThrow<boolean>('TRUST_PROXY')) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(requestLoggingMiddleware);
  app.setGlobalPrefix('api/v1', { exclude: ['health/(.*)', 'docs/(.*)'] });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });
  app.useBodyParser('json', { limit: '100kb' });
  app.useBodyParser('urlencoded', { limit: '100kb', extended: true });
  app.enableShutdownHooks(['SIGINT', 'SIGTERM']);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      stopAtFirstError: true,
    }),
  );

  await app.listen(port);
  Logger.log(`Server running on port ${port}`, 'Bootstrap');
}
void bootstrap();
