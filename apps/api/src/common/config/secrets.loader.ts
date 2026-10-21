import { existsSync } from 'fs';
import { join } from 'path';

// Carrega a configuração da API antes do Nest subir.
//
// Ordem de precedência (a primeira que definir a variável vence):
//   1. Variáveis de ambiente do processo (Docker `env_file`, systemd, CI...)
//   2. Arquivo `.env` em `apps/api/` (desenvolvimento local)
//   3. AWS Secrets Manager — só com SECRETS_SOURCE=aws (legado, opcional)
//
// Assim a API roda em qualquer máquina (VM Debian, VPS, EC2) sem depender de
// um provedor de nuvem específico.

type Environment = 'development' | 'staging' | 'production' | 'test';

const VALID_ENVIRONMENTS: Environment[] = ['development', 'staging', 'production', 'test'];

const REQUIRED_KEYS = ['MONGODB_URI', 'REDIS_HOST', 'JWT_SECRET', 'ANTHROPIC_API_KEY'] as const;

const TEST_CONFIG: Record<string, string> = {
  MONGODB_URI: 'mongodb://localhost:27017/medicano-test',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  JWT_SECRET: 'test-secret',
  ANTHROPIC_API_KEY: 'test-anthropic-key',
};

function assertEnvironment(): Environment {
  const env = process.env.NODE_ENV as Environment;
  if (!VALID_ENVIRONMENTS.includes(env)) {
    throw new Error(
      `NODE_ENV must be one of: ${VALID_ENVIRONMENTS.join(', ')}. Got: "${env ?? 'undefined'}"`,
    );
  }
  return env;
}

function loadDotEnvFile(): void {
  const path = join(process.cwd(), '.env');
  if (existsSync(path)) {
    // Não sobrescreve variáveis que já existem no ambiente.
    process.loadEnvFile(path);
  }
}

function assertRequired(): void {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (process.env.NODE_ENV === 'production' && (process.env.JWT_SECRET ?? '').length < 32) {
    throw new Error('JWT_SECRET must have at least 32 characters in production');
  }
}

export async function loadSecrets(): Promise<void> {
  const env = assertEnvironment();

  if (env === 'test') {
    for (const [key, value] of Object.entries(TEST_CONFIG)) {
      process.env[key] ??= value;
    }
    return;
  }

  loadDotEnvFile();

  if (process.env.SECRETS_SOURCE === 'aws') {
    const { loadAwsSecrets } = await import('./aws-secrets.loader.js');
    const secrets = await loadAwsSecrets(env);
    for (const [key, value] of Object.entries(secrets)) {
      process.env[key] ??= value;
    }
  }

  assertRequired();
}
