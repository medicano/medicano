import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { writeFileSync } from 'node:fs';

if (process.env.VERCEL === '1') {
  console.log('Skipping AWS secrets: running on Vercel (env vars injected via Vercel dashboard).');
  process.exit(0);
}

if (process.env.SKIP_AWS_SECRETS === '1') {
  console.log('Skipping AWS secrets: SKIP_AWS_SECRETS=1 is set.');
  process.exit(0);
}

const AWS_ENVIRONMENTS = ['development', 'staging', 'production'];

const env = process.env.NODE_ENV ?? 'development';

if (!AWS_ENVIRONMENTS.includes(env)) {
  console.error(`NODE_ENV must be one of: ${AWS_ENVIRONMENTS.join(', ')}. Got: "${env}"`);
  process.exit(1);
}

const secretName = `medicano/web/${env}`;

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? 'sa-east-1',
});

console.log(`Fetching secret: ${secretName}`);

const response = await client.send(
  new GetSecretValueCommand({ SecretId: secretName }),
);

if (!response.SecretString) {
  console.error(`AWS secret "${secretName}" is empty or binary`);
  process.exit(1);
}

const secrets = JSON.parse(response.SecretString);

const envFileContent = Object.entries(secrets)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n') + '\n';

writeFileSync('.env.local', envFileContent);
console.log(`Wrote ${Object.keys(secrets).length} variable(s) to .env.local`);
