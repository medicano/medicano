# Deploy do Medicano

O Medicano roda em qualquer Linux com Docker: uma VM Debian no Proxmox, uma VPS
(Hetzner, Oracle, Contabo, Magalu Cloud, DigitalOcean...) ou uma EC2. Nada no
código depende de um provedor de nuvem.

```
                ┌──────────── deploy/compose.yml ─────────────┐
internet ─► entrada ─► web  (Caddy, build estático do Vite)   │
  (tunnel ou caddy)  ─► api  (NestJS, porta 3000)             │
                │            ├─ redis (sessões, AOF)          │
                │            └─ mongo (profile db) ou Atlas   │
                └─────────────────────────────────────────────┘
```

| Peça | Antes (AWS) | Agora |
|---|---|---|
| Configuração | Secrets Manager | `deploy/.env` (ou variáveis de ambiente) |
| API | EC2 + PM2 + Nginx + Certbot | container `api` |
| Front | S3 + CloudFront | container `web` (Caddy) |
| E-mail | SES (SDK) | SMTP de qualquer provedor |
| Banco | Atlas | Mongo no compose (profile `db`) ou Atlas |
| Deploy | `git pull` + build na EC2 | imagens no GHCR + `docker compose pull` |

## 1. Preparar a máquina

Debian 13 ou Ubuntu 24.04, 2 vCPU e 2 GB de RAM bastam (4 GB com o Mongo
local). Instale o Docker do repositório oficial (docs.docker.com/engine/install/debian).

**VM no Proxmox (homelab):**

- **CPU type `host`.** O MongoDB 5+ exige AVX, e o tipo padrão do Proxmox
  esconde a instrução: o container morre com `Illegal instruction`.
  `qm set 102 --cpu host` e reiniciar a VM.
- **MTU 1492** (PPPoE da Vivo) também dentro do Docker, em
  `/etc/docker/daemon.json`:

  ```json
  { "mtu": 1492, "default-network-opts": { "bridge": { "com.docker.network.driver.mtu": "1492" } } }
  ```

  `sudo systemctl restart docker`. Sem isso, a API fala com a LAN mas trava em
  respostas grandes vindas de fora (Anthropic, Atlas).
- `qemu-guest-agent`, `unattended-upgrades`, SSH só com chave.

## 2. Primeira subida

```bash
sudo mkdir -p /opt/medicano && sudo chown $USER: /opt/medicano
git clone https://github.com/medicano/medicano-project /opt/medicano
cd /opt/medicano/deploy
cp .env.example .env && chmod 600 .env
nano .env                       # ver "Variáveis" abaixo
docker compose up -d --build    # a 1ª vez constrói local; depois o CI publica as imagens
docker compose ps               # api e redis "healthy"
docker compose logs -f api
```

### Variáveis

| Variável | O quê |
|---|---|
| `COMPOSE_PROFILES` | `db,tunnel` (homelab), `db,caddy` (VPS), ou sem `db` para Mongo externo |
| `MONGODB_URI` | Mongo local: `mongodb://USER:SENHA@mongo:27017/medicano?authSource=admin`. Externo: URI do Atlas |
| `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` | só com o profile `db`; precisam bater com a URI |
| `JWT_SECRET` | `openssl rand -hex 32` (mínimo 32 caracteres em produção) |
| `ANTHROPIC_API_KEY` | chave do assistente |
| `CORS_ORIGIN` / `COOKIE_DOMAIN` | `https://medicano.app` / `.medicano.app` |
| `SMTP_*`, `EMAIL_FROM` | qualquer SMTP. Vazio = e-mails só no log (bom para staging) |
| `CLOUDFLARE_TUNNEL_TOKEN` | profile `tunnel` |
| `WEB_DOMAIN`, `API_DOMAIN`, `ACME_EMAIL` | profile `caddy` |

A API valida as obrigatórias no boot e para com a lista do que falta.

## 3. Entrada

### Opção A — Cloudflare Tunnel (homelab, nenhuma porta aberta)

Zero Trust → Networks → Tunnels → Create (cloudflared) → copiar o token para
`CLOUDFLARE_TUNNEL_TOKEN`. Em Public hostnames:

| Hostname | Serviço |
|---|---|
| `medicano.app` | `http://web:80` |
| `api.medicano.app` | `http://api:3000` |

O túnel cria os registros DNS (nuvem laranja). Os nomes têm um nível só, então
o certificado grátis da Cloudflare cobre. **Não** coloque Cloudflare Access na
frente: o site é público.

### Opção B — Caddy com Let's Encrypt (VPS com IP público)

Registros A/AAAA de `medicano.app`, `www` e `api` apontando para a VPS. Na
Cloudflare: nuvem cinza, ou laranja com SSL/TLS em **Full (strict)**. Liberar
80/tcp, 443/tcp e 443/udp no firewall do provedor. O Caddy emite e renova os
certificados sozinho (`deploy/edge.Caddyfile`).

## 4. Migrar os dados do Atlas

```bash
# no PC ou na própria VM, com mongodump/mongorestore (mongodb-database-tools)
mongodump --uri "mongodb+srv://...atlas.../medicano" --archive=medicano.gz --gzip
docker compose cp medicano.gz mongo:/tmp/
docker compose exec mongo sh -c 'mongorestore -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive=/tmp/medicano.gz --gzip'
```

Sessões no Redis não migram: todo mundo faz login de novo uma vez.

## 5. Backup

O banco guarda dados de saúde (LGPD): **sem backup testado, não vai para usuário
real.**

- `deploy/backup-mongo.sh` faz `mongodump` em `deploy/backups/` e mantém 7 dias.
  Cron: `30 3 * * * /opt/medicano/deploy/backup-mongo.sh >> /opt/medicano/deploy/backups/backup.log 2>&1`
- Cópia fora da máquina: mandar `deploy/backups/` e o `.env` com restic para o
  rest-server da VPS (usuário próprio, append-only).
- Fotos das clínicas ficam no volume `medicano_uploads`
  (`docker run --rm -v medicano_uploads:/u -v $PWD:/b alpine tar czf /b/uploads.tgz -C /u .`).
- Testar a restauração (seção 4, com o arquivo do backup).

## 6. CI/CD (GitHub Actions)

`ci.yml` testa PRs. `deploy.yml`, a cada push na `main`: testes → imagens
`ghcr.io/medicano/medicano-{api,web}` (amd64 e arm64) → SSH no servidor →
`docker compose pull && up -d`.

No GitHub, ambiente **production**:

| Tipo | Nome | Valor |
|---|---|---|
| secret | `DEPLOY_SSH_KEY` | chave privada só para deploy (`ssh-keygen -t ed25519 -f medicano_deploy`) |
| secret | `DEPLOY_KNOWN_HOSTS` | `ssh-keyscan <host>` |
| var | `DEPLOY_HOST` / `DEPLOY_USER` | IP de tailnet ou público / usuário no grupo `docker` |
| var | `DEPLOY_DIR` | opcional, padrão `/opt/medicano/deploy` |
| var | `VITE_API_URL` | opcional, padrão `https://api.medicano.app` |
| var + secret | `TS_OAUTH_CLIENT_ID` + `TS_OAUTH_SECRET` | só no homelab |

**Homelab (Tailscale):** criar um OAuth client com escopo `auth_keys` e a tag
`tag:ci`, instalar o Tailscale na VM com uma tag própria (ex.: `tag:medicano`) e
liberar na política só `tag:ci → tag:medicano:22`. O runner entra no tailnet
como nó efêmero e some no fim do job.

**Pacotes do GHCR:** o repositório é público, então deixe os dois pacotes
públicos (Package settings → Change visibility). Se ficarem privados, faça
`docker login ghcr.io` na VM com um token só de `read:packages`.

Sem CI, o deploy manual é o mesmo do Framar-BI:
`git pull && docker compose up -d --build`.

## 7. Staging na mesma máquina

Outra pasta com outro `.env` (`COMPOSE_PROJECT_NAME=medicano-staging`,
`NODE_ENV=staging`, outro banco ou `MONGODB_URI` com `/medicano-staging`, outro
túnel ou hostname `staging-api.medicano.app`). Volumes e redes ficam separados
pelo nome do projeto.

## 8. Operação

```bash
docker compose ps
docker compose logs -f --tail=100 api
docker compose restart api
docker compose pull && docker compose up -d     # atualizar manualmente
docker compose exec mongo mongosh -u medicano -p --authenticationDatabase admin
```

## Desenvolvimento local

Sem AWS: `cp apps/api/.env.example apps/api/.env`, `cp apps/web/.env.example
apps/web/.env.local`, `docker compose --profile test up -d` na raiz e
`npm run dev:api` / `npm run dev:web`. O caminho antigo (Secrets Manager)
continua disponível com `SECRETS_SOURCE=aws` na API e `npm run load-secrets` no
front.
