import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { Role } from '../../common/enums/role.enum';
import { loadAwsSecrets } from '../../common/config/aws-secrets.loader';

const uniqueEmail = (): string =>
  `patient-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;

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
    }).compile();

    app = moduleFixture.createNestApplication();
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
    it('should create a new patient user and Patient document, returning an access token (201)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(patientPayload())
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.accessToken.length).toBeGreaterThan(0);
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

      expect(response.body).toHaveProperty('accessToken');
    });

    it('should allow signup without dateOfBirth for patient (optional)', async () => {
      const payload = patientPayload();
      delete (payload as any).dateOfBirth;

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
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
    it('should log in with valid credentials and return an access token (200/201)', async () => {
      const payload = patientPayload();

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(payload)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: payload.email, password: payload.password });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
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
    it('should return 204 when logging out with a valid bearer token', async () => {
      const signupRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(patientPayload())
        .expect(201);

      const accessToken = signupRes.body.accessToken;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('should return 401 when no Authorization header is provided', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });

  describe('Full flow: signup → login → logout → revoked token rejected', () => {
    it('should reject the same token after logout', async () => {
      const payload = patientPayload();

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(payload)
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: payload.email, password: payload.password });

      expect([200, 201]).toContain(loginRes.status);
      const accessToken = loginRes.body.accessToken;
      expect(typeof accessToken).toBe('string');

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});
