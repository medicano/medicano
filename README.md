# Medicano

Plataforma de gestão de clínicas e agendamentos médicos.

## Estrutura do monorepo

```
medicano/
├── apps/
│   ├── api/          # Backend NestJS (TypeScript + MongoDB + Redis)
│   └── web/          # Frontend React
├── packages/
│   └── types/        # Tipos TypeScript compartilhados
└── deploy/           # Docker Compose de produção (VM, VPS, homelab)
```

## Stack

| Camada      | Tecnologia                        |
|-------------|-----------------------------------|
| Backend     | NestJS · TypeScript · Mongoose    |
| Banco       | MongoDB                           |
| Sessão      | Redis (ioredis) — tokens revogáveis |
| Frontend    | React                             |

---

## Como rodar a API (`apps/api`)

### Pré-requisitos

- Node.js 20+
- Docker

### Infraestrutura local (Docker)

O `docker-compose.yml` tem dois serviços:

| Serviço   | Profile  | Quando sobe                         |
|-----------|----------|-------------------------------------|
| `redis`   | —        | Sempre, com `docker compose up -d`  |
| `mongodb` | `test`   | Só para testes, com `--profile test`|

Em dev, o MongoDB pode ser o do Docker (`--profile test`) ou remoto (`MONGODB_URI` no `apps/api/.env`). Só o Redis sobe por padrão:

```bash
# Sobe apenas o Redis (dev / stg / prod)
docker compose up -d
```

Para **testes**, MongoDB e Redis precisam estar rodando localmente:

```bash
# Sobe MongoDB + Redis (testes)
docker compose --profile test up -d
```

Para derrubar tudo:

```bash
docker compose --profile test down
```

### Configuração

A configuração vem de variáveis de ambiente, sem depender de provedor de nuvem. Ordem de precedência (`apps/api/src/common/config/secrets.loader.ts`):

1. Variáveis do processo (em produção, o `deploy/.env` via Docker Compose)
2. `apps/api/.env` (desenvolvimento local; modelo em `apps/api/.env.example`)
3. AWS Secrets Manager (`medicano/api/<NODE_ENV>`), **só** com `SECRETS_SOURCE=aws` — legado

| Variável | Obrigatória | Observação |
|---|---|---|
| `MONGODB_URI` | sim | |
| `REDIS_HOST` / `REDIS_PORT` | sim / não | |
| `JWT_SECRET` | sim | mínimo 32 caracteres em produção |
| `ANTHROPIC_API_KEY` | sim | |
| `CORS_ORIGIN`, `COOKIE_DOMAIN` | não | |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | não | sem `SMTP_HOST` os e-mails só vão para o log |

A API valida as obrigatórias no boot. Deploy (VM Debian, VPS, homelab): ver `deploy/README.md`.

> Em `NODE_ENV=test` a API usa config local hardcoded apontando para os containers Docker (`mongodb://localhost:27017/medicano-test`, Redis em `localhost`).

### Instalar dependências

```bash
cd apps/api
npm install
```

### Rodar em desenvolvimento

```bash
# Garanta que o Redis está rodando
docker compose up -d

cd apps/api
npm run start:dev
```

A API sobe em `http://localhost:3000` com hot-reload.

### Rodar em staging

```bash
docker compose up -d

cd apps/api
npm run stg
```

### Rodar em production

```bash
# Build primeiro
cd apps/api
npm run build

# Sobe a API compilada
npm run start
```

### Rodar os testes

```bash
# Garanta que MongoDB e Redis estão rodando
docker compose --profile test up -d

cd apps/api
npm test              # unitários + E2E
npm run test:watch    # modo watch
npm run test:cov      # com cobertura
npm run test:e2e      # só E2E
```

### Verificar tipos (TypeScript)

```bash
cd apps/api
npx tsc -p tsconfig.build.json --noEmit   # só código de produção
npx tsc --noEmit                           # produção + testes
```

---

## Histórico de sprints

Registro do que cada sprint entregou (escopo e regras de negócio).

### Sprint 01 — Authentication Foundation ✅

#### Escopo

- Criação de usuário com 4 roles: `patient`, `clinic`, `professional`, `attendant`
- Login padrão (email + senha) e login de atendente (clinicId + username + senha)
- JWT com expiração de 7 dias
- Validação dupla: JWT + token armazenado no Redis (revogável no logout)
- Hash de senha com bcrypt (cost 12)

#### Entidades

| Entidade           | Campos principais                                   |
|--------------------|-----------------------------------------------------|
| User               | role (imutável), email?, username?, clinicId?, passwordHash (oculto) |
| Clinic             | name, subscriptionStatus                            |
| Professional       | specialty, userId                                   |
| ClinicProfessional | clinicId + professionalId (índice único composto)   |

#### Regras de negócio

- `attendant` não pode ter email; não-atendentes não podem ter username
- Índice único `(role, email)` para não-atendentes
- Índice único `(clinicId, username)` para atendentes
- Signup realiza auto-login (retorna token imediatamente)
- Logout remove o token do Redis — requisições subsequentes com o mesmo JWT são rejeitadas

---

### Sprint 02 — RBAC + Shared Types ✅

#### Escopo

- Pacote de tipos compartilhados `@medicano/types` com interfaces e enums
- Decorator `@Roles()` e `RolesGuard` para controle de acesso baseado em papel
- Aplicação dos guards nos controllers existentes

---

### Sprint 03 — Appointments ✅

#### Escopo

- CRUD completo de agendamentos
- Detecção de conflito de horário por profissional
- Ciclo de vida de status: `SCHEDULED → CONFIRMED → COMPLETED / CANCELLED`

#### Regras de negócio

- `endAt` é calculado automaticamente: `startAt + durationMinutes * 60s`
- Conflito detectado via query de sobreposição: `startAt < endAt && endAt > startAt`
- Transições de status válidas definidas em mapa — estados terminais (`COMPLETED`, `CANCELLED`) não permitem mais transições

---

### Sprint 04 — Subscriptions ✅

#### Escopo

- Gerenciamento de planos de assinatura de clínicas
- Limite de profissionais por plano (`FREE`: 2, `BASIC`: 10, `PRO`: ilimitado)
- Integração com `ClinicProfessionalsService` para bloquear atribuições acima do limite

#### Regras de negócio

- Uma clínica tem no máximo uma assinatura ativa (índice único em `clinicId`)
- `enforceClinicProfessionalLimit` é chamado antes de qualquer atribuição de profissional
- Plano `FREE` é aplicado como padrão quando a clínica não tem assinatura cadastrada

---

### Sprint 05 — Chat (LLM Integration) ✅

#### Escopo

- Assistente de agendamento via linguagem natural integrado ao Claude API
- Sessões de chat por usuário com histórico de mensagens persistido no MongoDB
- Contexto de clínica opcional por sessão

#### Regras de negócio

- Janela de contexto: últimas 20 mensagens enviadas ao LLM
- Modelo: `claude-sonnet-4-6`, `max_tokens: 1024`
- `ANTHROPIC_API_KEY` lida do `ConfigService` — nunca hardcoded
- Todos os usuários autenticados podem usar o chat (sem restrição de role)

---

### Sprint 06 — Schema Enrichment & Public Search ✅

#### Escopo

- Enriquecer os schemas de `Clinic` e `Professional` com endereço, contato e identificação
- Criar enum `Specialty` usado pela plataforma
- Adicionar endpoints públicos de busca com filtros por especialidade e cidade
- Adicionar endpoints públicos de perfil de clínica e profissional

#### Entidades — campos novos

**Clinic**

| Campo | Tipo | Regras |
|-------|------|--------|
| `cnpj` | `string` | obrigatório, único, 14 dígitos |
| `specialties` | `Specialty[]` | obrigatório, mínimo 1 item |
| `address` | `Address` (subdocumento) | obrigatório |
| `phone` | `string` | opcional |
| `description` | `string` | opcional, máx 1000 caracteres |

**Professional**

| Campo | Tipo | Regras |
|-------|------|--------|
| `cpf` | `string` | obrigatório, único, 11 dígitos |
| `registration` | `string` | obrigatório (ex: "CRM/SP 123456") |
| `address` | `Address` (subdocumento) | obrigatório |
| `phone` | `string` | opcional |
| `description` | `string` | opcional, máx 1000 caracteres |

**Address** (subdocumento compartilhado)

| Campo | Tipo |
|-------|------|
| `street`, `number`, `neighborhood`, `city`, `state`, `zipCode` | obrigatórios |
| `complement` | opcional |

#### Endpoints

```
GET /search                      # público — busca por specialty e/ou city
GET /search/clinics/:id          # público — perfil de clínica
GET /search/professionals/:id    # público — perfil de profissional
```

---

### Sprint 07 — Triage Specialization (LLM Recommendation Flow) ✅

#### Escopo

- Transforma o chat genérico em um sistema de **triagem por especialidade**: através da conversa, identifica os sintomas e recomenda uma das especialidades da plataforma (RF03, RF04)
- Adiciona o aviso de não-diagnóstico exigido pela Resolução CFM 2.336/2023 (RN16)
- Aplica a regra de no máximo uma especialidade recomendada por sessão (RN17)

#### Campos novos

| Entidade      | Campo                  | Regras                                          |
|---------------|------------------------|-------------------------------------------------|
| `ChatSession` | `recommendedSpecialty` | opcional — definido uma vez ao concluir a triagem |
| `ChatSession` | `disclaimerShown`      | default `false` — vira `true` após a 1ª mensagem |

---

### Sprint 08 — Availability Slots ✅

#### Escopo

- Sistema de horários (slots) recorrentes semanais para clínicas e profissionais (RF18)
- Configuração de agendamento: `autoConfirm` e `minCancelNoticeHours` (RF19, RF23)
- Endpoint `GET /availability/:professionalId` que calcula os horários disponíveis em um intervalo de datas

#### Campos novos

| Entidade                | Campo                                   | Regras                          |
|-------------------------|-----------------------------------------|---------------------------------|
| `WeeklySlot` (subdoc)   | `dayOfWeek`, `startTime`, `endTime`, `slotDurationMinutes` | dia 0–6, horas "HH:mm", duração 15–240 min |
| `Clinic` / `Professional` | `weeklySlots`, `autoConfirm`, `minCancelNoticeHours` | default `[]`, `false`, `24h` |

---

### Sprint 09 — Patient Scheduling & Business Rules ✅

#### Escopo

- Paciente cria os próprios agendamentos (RF07–RF09) e cancela respeitando a antecedência mínima (RF12, RN08)
- Validação de que o horário corresponde a um slot disponível
- Status inicial definido pelo `autoConfirm` do prestador (RN06)

#### Regras de negócio

- RN01 — paciente não pode ter agendamentos sobrepostos
- RN04 — intervalo mínimo de 30 min entre agendamentos em clínicas diferentes
- RN06 — status inicial `CONFIRMED` se `autoConfirm`, senão `SCHEDULED`
- RN08 — cancelamento pelo paciente respeita `minCancelNoticeHours`

---

### Sprint 10 — Profile Management & Attendant CRUD ✅

#### Escopo

- Endpoints de auto-edição de perfil para `PATIENT`, `CLINIC` e `PROFESSIONAL`
- Schema `Patient` separado (nome, data de nascimento, telefone, endereço) ligado ao `User`
- CRUD completo de atendentes pela clínica
- Flag `linkedScheduling` na `Clinic` e a lógica correspondente em `AppointmentsService.checkConflict` (RN03, RN25)

---

### Sprint 11 — Provider Schedule View & Email Notifications ✅

#### Escopo

- Endpoint de agenda diária/semanal do prestador combinando agendamentos + slots livres (RF20)
- Módulo `notifications/` com integração AWS SES, disparado nos eventos de agendamento (criação, confirmação, cancelamento)
- `Subscription` generalizada para clínicas **e** profissionais autônomos; busca passa a filtrar autônomos sem plano ativo (RN20)

---

### Sprint 12 — TCC Alignment & Final Corrections ✅

#### Escopo

Sprint corretiva de alinhamento entre código e documentação do TCC (sem novas features):

- Enum `Specialty` com todas as especialidades referenciadas no TCC (RF03)
- Planos de assinatura renomeados para `FREE` / `BASIC` / `PRO` (limites 2 / 10 / ilimitado)
- `Clinic` e `Professional` com os campos exigidos pela documentação (CNPJ, CPF, endereço estruturado, registro, config de agendamento, descrição)
- `linkedScheduling` aplicado em `AppointmentsService.checkConflict`
- DTO de disponibilidade com intervalo de datas (`fromDate` + `toDate`)
- `User.displayName` e `User.isActive` declarados; `packages/types` sincronizado

---

### Sprint 13 — Chat Streaming Migration ✅

#### Escopo

- Migração do chat de `@anthropic-ai/sdk` para o Vercel AI SDK (`@ai-sdk/anthropic`)
- `POST /chat/sessions/:id/messages` passa a responder via `text/event-stream` (SSE) produzido por `streamText`
- Persistência da mensagem do assistente e extração da recomendação acontecem no callback `onFinish`

---

### Sprint 14 — Correções Pós-Auditoria ✅

#### Escopo

Sprint corretiva (sem novas features) que resolveu as divergências encontradas na auditoria das sprints 01–12:

- Enum `Specialty` com casing consistente
- Subscriptions com planos `FREE`/`BASIC`/`PRO`, schema orientado por `clinicId` e limites normalizados
- `Clinic` e `Professional` com os campos faltantes (CNPJ, CPF, `registration`, `weeklySlots`, `minCancelNoticeHours`)
- `AttendantsController`/`AttendantsService` registrados no `ClinicsModule`
- `NotificationsService` efetivamente chamado pelo `AppointmentsService`
- `SearchService` filtra profissionais sem assinatura ativa (RN20)
