import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';

import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { ClientIpRequest, getClientIp } from '../../common/throttle/client-ip';
import {
  DEFAULT_THROTTLE,
  THROTTLE_ERROR_MESSAGE,
} from '../../common/throttle/throttle-limits';

// Sobe só o AuthController com a mesma configuração de limite do AppModule,
// sem Mongo nem Redis: o que se testa aqui é o limite, não o login.
describe('Auth rate limiting (e2e)', () => {
  let app: INestApplication;

  const mockAuthService = {
    loginStandard: jest.fn(),
    loginAttendant: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
  };

  const login = (clientIp: string): request.Test =>
    request(app.getHttpServer())
      .post('/auth/login')
      .set('CF-Connecting-IP', clientIp)
      .send({ email: 'paciente@example.com', password: 'senha-qualquer' });

  beforeEach(async () => {
    mockAuthService.loginStandard.mockResolvedValue({
      accessToken: 'token',
      user: { id: 'user-1', role: 'patient' },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ name: 'default', ...DEFAULT_THROTTLE }],
          getTracker: (req) => getClientIp(req as ClientIpRequest),
          errorMessage: THROTTLE_ERROR_MESSAGE,
        }),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('should block the 11th login from the same IP within a minute', async () => {
    for (let attempt = 1; attempt <= 10; attempt++) {
      await login('203.0.113.7').expect(200);
    }

    const blocked = await login('203.0.113.7').expect(429);

    expect(blocked.body.message).toBe(THROTTLE_ERROR_MESSAGE);
    expect(mockAuthService.loginStandard).toHaveBeenCalledTimes(10);
  });

  it('should count each client IP separately', async () => {
    for (let attempt = 1; attempt <= 10; attempt++) {
      await login('203.0.113.7').expect(200);
    }

    await login('198.51.100.20').expect(200);
  });
});
