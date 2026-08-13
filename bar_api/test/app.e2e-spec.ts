import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';
import { AuthController } from './../src/auth/auth.controller';
import { AuthService } from './../src/auth/auth.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import helmet from 'helmet';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { requestLoggingMiddleware } from './../src/common/middleware/request-logging.middleware';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
      ],
      controllers: [AppController, AuthController],
      providers: [
        AppService,
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            logoutAll: jest.fn(),
          },
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(helmet());
    app.use(requestLoggingMiddleware);
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });

  it('returns security headers', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('X-Content-Type-Options', 'nosniff');
  });

  it('rejects unknown fields before reaching the controller', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo: 'user@example.com', contrasenia: 'password', extra: true })
      .expect(400)
      .expect((response) => {
        const body = response.body as {
          statusCode?: number;
          code?: string;
          requestId?: unknown;
          timestamp?: unknown;
          path?: string;
        };
        expect(body.statusCode).toBe(400);
        expect(body.code).toBe('VALIDATION_ERROR');
        expect(typeof body.requestId).toBe('string');
        expect(typeof body.timestamp).toBe('string');
        expect(body.path).toBe('/api/v1/auth/login');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
