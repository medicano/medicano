import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

type Environment = 'development' | 'staging' | 'production' | 'test';

const AWS_ENVIRONMENTS: Environment[] = [
  'development',
  'staging',
  'production',
];
const VALID_ENVIRONMENTS: Environment[] = [...AWS_ENVIRONMENTS, 'test'];

function resolveSecretName(): string {
  const env = process.env.NODE_ENV as Environment;
  if (!VALID_ENVIRONMENTS.includes(env)) {
    throw new Error(
      `NODE_ENV must be one of: ${VALID_ENVIRONMENTS.join(', ')}. Got: "${env ?? 'undefined'}"`,
    );
  }
  return `medicano/api/${env}`;
}

export async function loadAwsSecrets(): Promise<Record<string, string>> {
  if (process.env.NODE_ENV === 'test') {
    return {
      MONGODB_URI: 'mongodb://localhost:27017/medicano-test',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      JWT_SECRET: 'test-secret',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
    };
  }

  const secretName = resolveSecretName();

  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION ?? 'sa-east-1',
  });

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName }),
  );

  if (!response.SecretString) {
    throw new Error(
      `AWS secret "${secretName}" is empty or binary — only JSON string secrets are supported`,
    );
  }

  return JSON.parse(response.SecretString) as Record<string, string>;
}
