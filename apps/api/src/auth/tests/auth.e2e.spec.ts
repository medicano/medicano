import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../app.module';
import { Role } from '../../common/enums/role.enum';
import { loadAwsSecrets } from '../../common/config/aws-secrets.loader';
import { GeocodingService } from '../../common/geocoding/geocoding.service';

const uniqueEmail = (): string =>
  `patient-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;

// O token agora vai no cookie httpOnly (Set-Cookie), não no corpo. Extrai o par
// "medicano_token=<jwt>" para reenviar como header Cookie nas próximas chamadas.
const sessionCookie = (res: request.Response): string => {
  const setCookie = (res.headers['set-cookie'] as unknown as string[]) ?? [];
  const tokenCookie = setCookie.find((c) => c.startsWith('medicano_token='));
  return tokenCookie ? tokenCookie.split(';')[0] : '';
};

const patientPayload = (overrides: Record<string, unknown> = {}) => ({
  email: uniqueEmail(),
  password: 'StrongPassword123!',
  role: Role.PATIENT,
  name: 'Patient Tester',
  dateOfBirth: '1995-03-15',
  phone: '+5511987654321',
  ...overrides,
});

describe('Auth (e2e)', () => {
  let app: INestApplication;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    const secrets = await loadAwsSecrets();
    Object.assign(process.env, secrets);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Evita chamada de rede ao Nominatim durante os testes; coordenadas fixas.
      .overrideProvider(GeocodingService)
      .useValue({ geocodeAddress: jest.fn().mockResolvedValue({ lat: -23.55, lng: -46.63 }) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should create a new patient user and set the session cookie (201)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(patientPayload())
        .expect(201);

      expect(sessionCookie(response)).toMatch(/^medicano_token=.+/);
      expect(response.body.user).toHaveProperty('id');
      // O token nunca é exposto no corpo da resposta.
      expect(response.body).not.toHaveProperty('accessToken');
    });

    it('should accept optional fields (gender, pronouns, cep, city, state)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(
          patientPayload({
            gender: 'FEMALE',
            pronouns: 'SHE',
            cep: '01310100',
            city: 'São Paulo',
            state: 'SP',
          }),
        )
        .expect(201);

      expect(sessionCookie(response)).toMatch(/^medicano_token=.+/);
    });

    it('should allow signup without dateOfBirth for patient (optional)', async () => {
      const payload = patientPayload();
      delete (payload as any).dateOfBirth;

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(payload)
        .expect(201);

      expect(sessionCookie(response)).toMatch(/^medicano_token=.+/);
    });

    it('should return 400 when phone is missing for patient', async () => {
      const payload = patientPayload();
      delete (payload as any).phone;

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(payload)
        .expect(400);
    });

    it('should return 400 for a future dateOfBirth', async () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(patientPayload({ dateOfBirth: future.toISOString().slice(0, 10) }))
        .expect(400);
    });

    it('should return 409 when signing up with a duplicate email', async () => {
      const payload = patientPayload();

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(payload)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(payload)
        .expect(409);
    });

    it('should return 400 for invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'not-an-email',
          password: '',
          unexpectedField: 'nope',
        })
        .expect(400);
    });

    it('should return 409 (not 500) when a clinic signs up with a duplicate CNPJ', async () => {
      const cnpj = String(Math.floor(Math.random() * 1e14)).padStart(14, '0');
      const clinicPayload = (): Record<string, unknown> => ({
        role: Role.CLINIC,
        name: 'Clínica Tester',
        email: uniqueEmail(),
        password: 'StrongPassword123!',
        cnpj,
        addressText: 'Av. Paulista, 1000, São Paulo, SP',
      });

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(clinicPayload())
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(clinicPayload())
        .expect(409);

      expect(String(response.body.message).toLowerCase()).toContain('cnpj');
    });
  });

  describe('POST /auth/login', () => {
    it('should log in with valid credentials and set the session cookie (200/201)', async () => {
      const payload = patientPayload();

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(payload)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: payload.email, password: payload.password });

      expect([200, 201]).toContain(response.status);
      expect(sessionCookie(response)).toMatch(/^medicano_token=.+/);
      expect(response.body.user).toHaveProperty('id');
    });

    it('should return 401 for wrong password', async () => {
      const payload = patientPayload();

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(payload)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: payload.email, password: 'WrongPassword123!' })
        .expect(401);
    });

    it('should return 401 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail(),
          password: 'StrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 204 when logging out with a valid session cookie', async () => {
      const signupRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(patientPayload())
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', sessionCookie(signupRes))
        .expect(204);
    });

    it('should return 401 when no session cookie is provided', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });

  describe('Full flow: signup → login → logout → revoked session rejected', () => {
    it('should reject the same session cookie after logout', async () => {
      const payload = patientPayload();

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(payload)
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: payload.email, password: payload.password });

      expect([200, 201]).toContain(loginRes.status);
      const cookie = sessionCookie(loginRes);
      expect(cookie).toMatch(/^medicano_token=.+/);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookie)
        .expect(204);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookie)
        .expect(401);
    });
  });
});
