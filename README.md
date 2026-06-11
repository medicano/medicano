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
└── medicano_crew/    # Automação de desenvolvimento com CrewAI
```

## Stack

| Camada      | Tecnologia                        |
|-------------|-----------------------------------|
| Backend     | NestJS · TypeScript · Mongoose    |
| Banco       | MongoDB                           |
| Sessão      | Redis (ioredis) — tokens revogáveis |
| Frontend    | React                             |
| Automação   | CrewAI + Aider                    |

---

## Como rodar a API (`apps/api`)

### Pré-requisitos

- Node.js 20+
- Docker
- AWS CLI configurado com acesso ao Secrets Manager (`aws configure` ou AWS SSO)

### Infraestrutura local (Docker)

O `docker-compose.yml` tem dois serviços:

| Serviço   | Profile  | Quando sobe                         |
|-----------|----------|-------------------------------------|
| `redis`   | —        | Sempre, com `docker compose up -d`  |
| `mongodb` | `test`   | Só para testes, com `--profile test`|

Em **dev, staging e production** o MongoDB é remoto (configurado no AWS Secrets Manager). Só o Redis roda localmente:

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

### Configuração (AWS Secrets Manager)

A API não usa `.env`. Toda a configuração vem do AWS Secrets Manager. O secret é selecionado pelo `NODE_ENV`:

| Ambiente    | Secret buscado              |
|-------------|-----------------------------|
| development | `medicano/api/development`  |
| staging     | `medicano/api/staging`      |
| production  | `medicano/api/production`   |

Cada secret é um JSON com os campos:

```json
{
  "MONGODB_URI": "mongodb+srv://...",
  "REDIS_HOST": "...",
  "REDIS_PORT": "6379",
  "JWT_SECRET": "...",
  "ANTHROPIC_API_KEY": "sk-ant-..."
}
```

A região AWS é lida de `AWS_REGION` (padrão: `sa-east-1`).

> Em `NODE_ENV=test` a API **não** chama a AWS — usa config local hardcoded apontando para os containers Docker (`mongodb://localhost:27017/medicano-test`, Redis em `localhost`).

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
npm run start:stg
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

## Automação com CrewAI (`medicano_crew/`)

O diretório `medicano_crew/` contém um flow CrewAI que recebe um pedido de implementação em linguagem natural, gera o código completo e o aplica no repositório via [Aider](https://github.com/paul-gauthier/aider).

### Como funciona

```
pedido (texto)
    │
    ▼
[Architect]  →  plano técnico (arquivos, tipos, endpoints, regras de negócio)
    │
    ▼
[Developer]  →  código completo de cada arquivo (formato Aider)
    │
    ▼
[Documenter] →  JSDoc + @ApiProperty + resumo dos endpoints
    │
    ▼
[Reviewer]   →  lista de issues (crítico / médio / baixo)
    │
    ▼
Aider aplica as alterações no repositório
```

### Agentes

| Agente      | LLM                              | Responsabilidade                              |
|-------------|----------------------------------|-----------------------------------------------|
| Architect   | openrouter/openai/o4-mini        | Plano técnico antes de qualquer linha de código |
| Developer   | openrouter/anthropic/claude-sonnet-4-5 | Implementação completa sem TODOs        |
| Documenter  | openrouter/google/gemini-2.5-flash | JSDoc, Swagger, exemplos de uso            |
| Reviewer    | openrouter/openai/o4-mini        | Segurança, tipagem, regras de negócio         |

### Configuração

```bash
cd medicano_crew

# Copie e preencha as variáveis de ambiente
cp .env.example .env   # OPENAI_API_KEY, AIDER_MODEL, etc.

# Instale as dependências (requer uv)
uv sync
```

### Executar um único pedido

```bash
# Interativo (pede o pedido no terminal)
uv run kickoff

# Via argumento direto
uv run kickoff "Criar endpoint de listagem de pacientes com paginação"
```

Os artefatos gerados ficam em:

```
medicano_crew/output/
├── prompts/      # Prompt enviado ao Aider (por run_id)
├── review.md     # Último relatório do Reviewer
└── phase_state/  # Marcadores de etapas concluídas
```

---

## Sprints — execução em lote

Cada sprint é descrita em dois arquivos dentro de `medicano_crew/docs/specs/`:

| Arquivo                    | Conteúdo                                      |
|----------------------------|-----------------------------------------------|
| `sprint-XX-<nome>.md`      | Especificação humana (entidades, regras, escopo) |
| `sprint-XX-prompts.json`   | Sequência de prompts prontos para o CrewAI    |

### Formato do JSON de prompts

```json
{
  "sprint": "sprint-01-auth",
  "description": "Descrição da sprint",
  "context": { ... },
  "prompts": [
    {
      "id": 1,
      "name": "nome-curto",
      "description": "O que este prompt implementa",
      "request": "Texto completo enviado ao CrewAI"
    }
  ]
}
```

### Script `run_sprint.py`

Executa todos os prompts de uma sprint em sequência, aplicando cada um via Aider.

```bash
cd medicano_crew

# Rodar a sprint completa (usa sprint-01-prompts.json por padrão)
python run_sprint.py

# Especificar outro arquivo de sprint
python run_sprint.py docs/specs/sprint-02-prompts.json

# Retomar a partir de um prompt específico (após erro)
python run_sprint.py --from 4

# Executar apenas um prompt
python run_sprint.py --only 6

# Pular prompts já concluídos (re-execução idempotente)
python run_sprint.py --skip-done

# Ver os prompts sem executar nada
python run_sprint.py --dry-run

# Ajustar intervalo entre prompts (padrão: 5s)
python run_sprint.py --delay 10
```

O script salva um marcador em `output/phase_state/` ao concluir cada prompt. Se uma execução falhar, basta corrigir o problema e usar `--from <id>` para retomar sem retrabalho.

---

## Sprint 01 — Authentication Foundation ✅

**Spec:** `medicano_crew/docs/specs/sprint-01-auth.md`
**Prompts:** `medicano_crew/docs/specs/sprint-01-prompts.json`

### Escopo

- Criação de usuário com 4 roles: `patient`, `clinic`, `professional`, `attendant`
- Login padrão (email + senha) e login de atendente (clinicId + username + senha)
- JWT com expiração de 7 dias
- Validação dupla: JWT + token armazenado no Redis (revogável no logout)
- Hash de senha com bcrypt (cost 12)

### Entidades

| Entidade           | Campos principais                                   |
|--------------------|-----------------------------------------------------|
| User               | role (imutável), email?, username?, clinicId?, passwordHash (oculto) |
| Clinic             | name, subscriptionStatus                            |
| Professional       | specialty, userId                                   |
| ClinicProfessional | clinicId + professionalId (índice único composto)   |

### Regras de negócio

- `attendant` não pode ter email; não-atendentes não podem ter username
- Índice único `(role, email)` para não-atendentes
- Índice único `(clinicId, username)` para atendentes
- Signup realiza auto-login (retorna token imediatamente)
- Logout remove o token do Redis — requisições subsequentes com o mesmo JWT são rejeitadas

### Sequência de prompts

| # | Nome                          | O que implementa                                        |
|---|-------------------------------|---------------------------------------------------------|
| 1 | `shared-types`                | Interfaces e enums em `packages/types`                  |
| 2 | `user-schema`                 | Schema Mongoose do User com indexes                     |
| 3 | `clinic-professional-schemas` | Schemas de Clinic, Professional, ClinicProfessional     |
| 4 | `users-module`                | Repositório + Service + bcrypt (cost 12)                |
| 5 | `signup-and-login`            | Endpoints `/auth/signup` e `/auth/login` com DTOs       |
| 6 | `redis-token-service`         | RedisService com save / validate / remove token         |
| 7 | `jwt-strategy-and-guards`     | JwtStrategy com validação dupla Redis + Guards + Decorators |
| 8 | `logout-endpoint`             | POST `/auth/logout` que revoga o token no Redis         |
| 9 | `auth-tests`                  | Testes unitários e e2e de toda a camada de auth         |

---

## Sprint 02 — RBAC + Shared Types ✅

**Spec:** `medicano_crew/docs/specs/sprint-02-rbac.md`
**Prompts:** `medicano_crew/docs/specs/sprint-02-prompts.json`

### Escopo

- Pacote de tipos compartilhados `@medicano/types` com interfaces e enums
- Decorator `@Roles()` e `RolesGuard` para controle de acesso baseado em papel
- Aplicação dos guards nos controllers existentes

### Sequência de prompts

| # | Nome                    | O que implementa                                                    |
|---|-------------------------|---------------------------------------------------------------------|
| 1 | `shared-types`          | Pacote `packages/types` com interfaces `IUser`, `IClinic`, `IProfessional` |
| 2 | `roles-decorator-guard` | Decorator `@Roles()` e `RolesGuard`                                 |
| 3 | `controller-guards`     | Aplica `RolesGuard` e `@Roles` nos controllers existentes           |
| 4 | `roles-guard-tests`     | Testes unitários do `RolesGuard`                                    |

---

## Sprint 03 — Appointments ✅

**Spec:** `medicano_crew/docs/specs/sprint-03-appointments.md`
**Prompts:** `medicano_crew/docs/specs/sprint-03-prompts.json`

### Escopo

- CRUD completo de agendamentos
- Detecção de conflito de horário por profissional
- Ciclo de vida de status: `SCHEDULED → CONFIRMED → COMPLETED / CANCELLED`

### Regras de negócio

- `endAt` é calculado automaticamente: `startAt + durationMinutes * 60s`
- Conflito detectado via query de sobreposição: `startAt < endAt && endAt > startAt`
- Transições de status válidas definidas em mapa — estados terminais (`COMPLETED`, `CANCELLED`) não permitem mais transições

### Sequência de prompts

| # | Nome                        | O que implementa                                              |
|---|-----------------------------|---------------------------------------------------------------|
| 1 | `appointment-schema`        | Schema com enum de status, mapa de transições e índice de conflito |
| 2 | `appointment-dtos`          | DTOs de criação, atualização, filtro e mudança de status      |
| 3 | `appointments-service`      | Service com detecção de conflito e validação de transições    |
| 4 | `appointments-controller`   | Controller com guards por role nas rotas de mutação           |
| 5 | `appointments-module-and-app` | Module e registro no AppModule                              |
| 6 | `appointments-tests`        | Testes unitários: CRUD, conflito e transições de status       |

---

## Sprint 04 — Subscriptions ✅

**Spec:** `medicano_crew/docs/specs/sprint-04-subscriptions.md`
**Prompts:** `medicano_crew/docs/specs/sprint-04-prompts.json`

### Escopo

- Gerenciamento de planos de assinatura de clínicas
- Limite de profissionais por plano (`FREE`: 2, `BASIC`: 10, `PRO`: ilimitado)
- Integração com `ClinicProfessionalsService` para bloquear atribuições acima do limite

### Regras de negócio

- Uma clínica tem no máximo uma assinatura ativa (índice único em `clinicId`)
- `enforceClinicProfessionalLimit` é chamado antes de qualquer atribuição de profissional
- Plano `FREE` é aplicado como padrão quando a clínica não tem assinatura cadastrada

### Sequência de prompts

| # | Nome                                   | O que implementa                                         |
|---|----------------------------------------|----------------------------------------------------------|
| 1 | `subscription-schema`                  | Schema com enum de planos e mapa de limites              |
| 2 | `subscription-dtos`                    | DTOs de criação e atualização                            |
| 3 | `subscriptions-service`                | Service incluindo `enforceClinicProfessionalLimit`       |
| 4 | `subscriptions-controller`             | Controller com acesso restrito ao role `CLINIC`          |
| 5 | `subscriptions-module-and-app`         | Module e registro no AppModule                           |
| 6 | `clinic-professionals-limit-enforcement` | Integração do limite no `ClinicProfessionalsService`   |
| 7 | `subscriptions-tests`                  | Testes unitários: CRUD e enforcement de limites          |

---

## Sprint 05 — Chat (LLM Integration) ✅

**Spec:** `medicano_crew/docs/specs/sprint-05-chat.md`
**Prompts:** `medicano_crew/docs/specs/sprint-05-prompts.json`

### Escopo

- Assistente de agendamento via linguagem natural integrado ao Claude API
- Sessões de chat por usuário com histórico de mensagens persistido no MongoDB
- Contexto de clínica opcional por sessão

### Regras de negócio

- Janela de contexto: últimas 20 mensagens enviadas ao LLM
- Modelo: `claude-sonnet-4-6`, `max_tokens: 1024`
- `ANTHROPIC_API_KEY` lida do `ConfigService` — nunca hardcoded
- Todos os usuários autenticados podem usar o chat (sem restrição de role)

### Sequência de prompts

| # | Nome                    | O que implementa                                              |
|---|-------------------------|---------------------------------------------------------------|
| 1 | `install-anthropic-sdk` | Adiciona `@anthropic-ai/sdk` às dependências da API           |
| 2 | `chat-schemas`          | Schemas `ChatSession` e `ChatMessage` com enum `MessageRole`  |
| 3 | `chat-dtos`             | DTOs `CreateSessionDto` e `SendMessageDto`                    |
| 4 | `chat-service`          | Service com histórico de conversa e integração com Claude API |
| 5 | `chat-controller`       | Controller — todos os endpoints exigem autenticação           |
| 6 | `chat-module-and-app`   | Module e registro no AppModule                                |
| 7 | `chat-tests`            | Testes unitários com Anthropic client mockado                 |

---

## Sprint 06 — Schema Enrichment & Public Search ✅

**Spec:** `medicano_crew/docs/specs/sprint-06-enrichment.md`
**Prompts:** `medicano_crew/docs/specs/sprint-06-prompts.json`

### Escopo

- Enriquecer os schemas de `Clinic` e `Professional` com endereço, contato e identificação
- Criar enum `Specialty` usado pela plataforma
- Adicionar endpoints públicos de busca com filtros por especialidade e cidade
- Adicionar endpoints públicos de perfil de clínica e profissional

### Entidades — campos novos

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

### Endpoints

```
GET /search                      # público — busca por specialty e/ou city
GET /search/clinics/:id          # público — perfil de clínica
GET /search/professionals/:id    # público — perfil de profissional
```

### Sequência de prompts

| # | Nome                              | O que implementa                                              |
|---|-----------------------------------|---------------------------------------------------------------|
| 1 | `specialty-enum-and-address-schema` | Enum `Specialty` + subdocumento `Address` + `AddressDto`    |
| 2 | `enrich-clinic-schema`            | Adiciona novos campos ao schema e DTOs de `Clinic`            |
| 3 | `enrich-professional-schema`      | Adiciona novos campos ao schema e DTOs de `Professional`      |
| 4 | `search-module`                   | Module de busca pública com filtros de specialty e city       |
| 5 | `search-tests`                    | Testes unitários do `SearchService`                           |
| 6 | `register-search-and-update-types` | Registra `SearchModule` no AppModule e atualiza `@medicano/types` |

Para executar:

```bash
cd medicano_crew
python run_sprint.py docs/specs/sprint-06-prompts.json
```

---

## Sprint 07 — Triage Specialization (LLM Recommendation Flow) ✅

**Spec:** `medicano_crew/docs/specs/sprint-07-triage.md`
**Prompts:** `medicano_crew/docs/specs/sprint-07-prompts.json`

### Escopo

- Transforma o chat genérico em um sistema de **triagem por especialidade**: através da conversa, identifica os sintomas e recomenda uma das especialidades da plataforma (RF03, RF04)
- Adiciona o aviso de não-diagnóstico exigido pela Resolução CFM 2.336/2023 (RN16)
- Aplica a regra de no máximo uma especialidade recomendada por sessão (RN17)

### Campos novos

| Entidade      | Campo                  | Regras                                          |
|---------------|------------------------|-------------------------------------------------|
| `ChatSession` | `recommendedSpecialty` | opcional — definido uma vez ao concluir a triagem |
| `ChatSession` | `disclaimerShown`      | default `false` — vira `true` após a 1ª mensagem |

---

## Sprint 08 — Availability Slots ✅

**Spec:** `medicano_crew/docs/specs/sprint-08-availability.md`
**Prompts:** `medicano_crew/docs/specs/sprint-08-prompts.json`

### Escopo

- Sistema de horários (slots) recorrentes semanais para clínicas e profissionais (RF18)
- Configuração de agendamento: `autoConfirm` e `minCancelNoticeHours` (RF19, RF23)
- Endpoint `GET /availability/:professionalId` que calcula os horários disponíveis em um intervalo de datas

### Campos novos

| Entidade                | Campo                                   | Regras                          |
|-------------------------|-----------------------------------------|---------------------------------|
| `WeeklySlot` (subdoc)   | `dayOfWeek`, `startTime`, `endTime`, `slotDurationMinutes` | dia 0–6, horas "HH:mm", duração 15–240 min |
| `Clinic` / `Professional` | `weeklySlots`, `autoConfirm`, `minCancelNoticeHours` | default `[]`, `false`, `24h` |

---

## Sprint 09 — Patient Scheduling & Business Rules ✅

**Spec:** `medicano_crew/docs/specs/sprint-09-patient-scheduling.md`
**Prompts:** `medicano_crew/docs/specs/sprint-09-prompts.json`

### Escopo

- Paciente cria os próprios agendamentos (RF07–RF09) e cancela respeitando a antecedência mínima (RF12, RN08)
- Validação de que o horário corresponde a um slot disponível
- Status inicial definido pelo `autoConfirm` do prestador (RN06)

### Regras de negócio

- RN01 — paciente não pode ter agendamentos sobrepostos
- RN04 — intervalo mínimo de 30 min entre agendamentos em clínicas diferentes
- RN06 — status inicial `CONFIRMED` se `autoConfirm`, senão `SCHEDULED`
- RN08 — cancelamento pelo paciente respeita `minCancelNoticeHours`

---

## Sprint 10 — Profile Management & Attendant CRUD ✅

**Spec:** `medicano_crew/docs/specs/sprint-10-profile-attendants.md`
**Prompts:** `medicano_crew/docs/specs/sprint-10-prompts.json`

### Escopo

- Endpoints de auto-edição de perfil para `PATIENT`, `CLINIC` e `PROFESSIONAL`
- Schema `Patient` separado (nome, data de nascimento, telefone, endereço) ligado ao `User`
- CRUD completo de atendentes pela clínica
- Flag `linkedScheduling` na `Clinic` e a lógica correspondente em `AppointmentsService.checkConflict` (RN03, RN25)

---

## Sprint 11 — Provider Schedule View & Email Notifications ✅

**Spec:** `medicano_crew/docs/specs/sprint-11-schedule-notifications.md`
**Prompts:** `medicano_crew/docs/specs/sprint-11-prompts.json`

### Escopo

- Endpoint de agenda diária/semanal do prestador combinando agendamentos + slots livres (RF20)
- Módulo `notifications/` com integração AWS SES, disparado nos eventos de agendamento (criação, confirmação, cancelamento)
- `Subscription` generalizada para clínicas **e** profissionais autônomos; busca passa a filtrar autônomos sem plano ativo (RN20)

---

## Sprint 12 — TCC Alignment & Final Corrections ✅

**Spec:** `medicano_crew/docs/specs/sprint-12-tcc-alignment.md`
**Prompts:** `medicano_crew/docs/specs/sprint-12-prompts.json`

### Escopo

Sprint corretiva de alinhamento entre código e documentação do TCC (sem novas features):

- Enum `Specialty` com todas as especialidades referenciadas no TCC (RF03)
- Planos de assinatura renomeados para `FREE` / `BASIC` / `PRO` (limites 2 / 10 / ilimitado)
- `Clinic` e `Professional` com os campos exigidos pela documentação (CNPJ, CPF, endereço estruturado, registro, config de agendamento, descrição)
- `linkedScheduling` aplicado em `AppointmentsService.checkConflict`
- DTO de disponibilidade com intervalo de datas (`fromDate` + `toDate`)
- `User.displayName` e `User.isActive` declarados; `packages/types` sincronizado

---

## Sprint 13 — Chat Streaming Migration ✅

**Prompts:** `medicano_crew/docs/specs/sprint-13-prompts.json`

### Escopo

- Migração do chat de `@anthropic-ai/sdk` para o Vercel AI SDK (`@ai-sdk/anthropic`)
- `POST /chat/sessions/:id/messages` passa a responder via `text/event-stream` (SSE) produzido por `streamText`
- Persistência da mensagem do assistente e extração da recomendação acontecem no callback `onFinish`

---

## Sprint 14 — Correções Pós-Auditoria ✅

**Spec:** `medicano_crew/docs/specs/sprint-14-corrections.md`
**Prompts:** `medicano_crew/docs/specs/sprint-14-prompts.json`

### Escopo

Sprint corretiva (sem novas features) que resolveu as divergências encontradas na auditoria das sprints 01–12:

- Enum `Specialty` com casing consistente
- Subscriptions com planos `FREE`/`BASIC`/`PRO`, schema orientado por `clinicId` e limites normalizados
- `Clinic` e `Professional` com os campos faltantes (CNPJ, CPF, `registration`, `weeklySlots`, `minCancelNoticeHours`)
- `AttendantsController`/`AttendantsService` registrados no `ClinicsModule`
- `NotificationsService` efetivamente chamado pelo `AppointmentsService`
- `SearchService` filtra profissionais sem assinatura ativa (RN20)
