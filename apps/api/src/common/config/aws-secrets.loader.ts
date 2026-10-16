import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

// Legado: só é carregado quando SECRETS_SOURCE=aws (ver secrets.loader.ts).
// Pode ser apagado, junto com @aws-sdk/client-secrets-manager, depois que
// nenhum ambiente depender mais do Secrets Manager.
export async function loadAwsSecrets(
  env: 'development' | 'staging' | 'production',
): Promise<Record<string, string>> {
  const secretName = `medicano/api/${env}`;

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
