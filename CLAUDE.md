# Medicano — Guia de Desenvolvimento

Plataforma de gestão de clínicas e agendamentos médicos.

Este documento é a fonte de verdade para qualquer agente de IA (Claude Code) ou desenvolvedor que trabalhe neste projeto. Leia-o completamente antes de escrever qualquer linha de código.

---

## Estrutura do Monorepo

```
medicano/
├── apps/
│   ├── api/                  # Backend NestJS
│   └── web/                  # Frontend React (Vite)
├── packages/
│   └── types/                # @medicano/types — tipos compartilhados entre apps
├── deploy/                   # Docker Compose de produção e staging (VM, VPS, homelab)
├── .github/workflows/ci.yml  # CI: build + testes da API, lint + build do web
├── Dockerfile                # Imagens da API e do web (targets `api` e `web`)
├── docker-compose.yml        # Infra local (MongoDB + Redis)
├── CLAUDE.md                 # Este arquivo
└── README.md                 # Como rodar + histórico de sprints
```

O repositório usa **npm workspaces** (`apps/*` e `packages/*`): instale as dependências uma vez, na raiz.

---

## Como Rodar o Projeto

### Pré-requisitos

- Node.js 22 (versão fixada no `.nvmrc`)
- Docker (MongoDB + Redis)

```bash
npm install            # na raiz — instala todos os workspaces
npm run types:build    # compila packages/types (necessário antes de buildar api/web)
```

### Infraestrutura local

No `docker-compose.yml` o MongoDB está no profile `test`, então o `up` simples sobe **só o Redis**:

```bash
docker compose up -d                  # só Redis (6379) — Mongo vem do MONGODB_URI
docker compose --profile test up -d   # MongoDB (27017) + Redis — necessário para os testes
docker compose --profile test down
```

### API (`apps/api`)

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

A API valida as obrigatórias no boot.

| Ambiente | Comando (dentro de `apps/api`) |
|---|---|
| Development | `npm run start:dev` (ou `npm run dev:api` na raiz) |
| Staging | `npm run start:staging` |
| Production | `npm run start:prod` (ou o container de `deploy/`) |

### Web (`apps/web`)

Copie `apps/web/.env.example` para `apps/web/.env.local`. A única variável é `VITE_API_URL` (padrão `http://localhost:3000`); variáveis `VITE_*` entram no bundle e são públicas.

```bash
npm run dev:web   # na raiz
```

### Testes

```bash
cd apps/api
npm test          # unitários + E2E (requer MongoDB e Redis rodando)
```

Os testes rodam com `NODE_ENV=test`. Nesse ambiente, `loadSecrets` preenche uma config local hardcoded apontando para o Docker local (`mongodb://localhost:27017/medicano-test`, Redis em `localhost`).

### CI e deploy

- O CI (`.github/workflows/ci.yml`) roda em todo push e PR: build + testes da API (com Mongo e Redis como serviços) e lint + build do web.
- Deploy é **por pull na VM** (`deploy/medicano-deploy.sh`): o staging publica os commits da `main` com CI verde; a produção publica **tags** cujo commit passou no CI.
- Detalhes (VM Debian, VPS, homelab, Caddy, Cloudflare): ver `deploy/README.md`.

---

## Stack Completa

| Camada       | Tecnologia                                          |
|--------------|-----------------------------------------------------|
| Backend      | NestJS 10 · TypeScript 5 · class-validator          |
| Banco        | MongoDB 7 (Mongoose 8)                              |
| Cache/Sessão | Redis 7 (ioredis 5) — tokens JWT revogáveis         |
| Auth         | Passport.js · passport-jwt · bcrypt (cost 12)       |
| IA           | Vercel AI SDK (`ai` 4 + `@ai-sdk/anthropic`) — streaming via SSE |
| E-mail       | nodemailer (SMTP)                                   |
| Frontend     | React 19 · Vite 6 · TypeScript · Tailwind CSS 4 · React Router 7 |
| Testes       | Jest · ts-jest · @nestjs/testing                    |
| Infra        | Docker · Caddy · GitHub Actions                     |
| Package mgr  | npm (workspaces)                                    |

---

## Arquitetura do Backend (`apps/api`)

### Estrutura de pastas

Cada domínio de negócio é um módulo NestJS independente. A base de cada módulo é sempre a mesma:

```
src/
├── <dominio>/
│   ├── dto/
│   │   ├── create-<dominio>.dto.ts
│   │   └── update-<dominio>.dto.ts
│   ├── schemas/
│   │   └── <dominio>.schema.ts
│   ├── tests/
│   │   └── <dominio>.service.spec.ts
│   ├── <dominio>.controller.ts
│   ├── <dominio>.module.ts
│   └── <dominio>.service.ts
├── common/
│   ├── config/               # secrets.loader (env) + aws-secrets.loader (legado)
│   ├── decorators/           # Decorators reutilizáveis (@CurrentUser, @CurrentUserRole)
│   ├── dto/                  # DTOs compartilhados (Address, AddressForm, WeeklySlot)
│   ├── enums/                # Enums globais (role, specialty, gender, sex, pronouns...)
│   ├── filters/              # Filtros de exceção globais
│   ├── geocoding/            # GeocodingModule (@Global)
│   ├── pipes/                # ParseMongoIdPipe
│   ├── schemas/              # Subdocumentos embutidos (Address, AddressForm, WeeklySlot)
│   ├── throttle/             # Rate limit por IP
│   └── utils/                # Funções puras compartilhadas
├── redis/
│   ├── redis.module.ts       # Global, exporta RedisService
│   └── redis.service.ts
├── app.module.ts
└── main.ts
```

Quando um módulo cresce, ele pode ter estas subpastas opcionais — use só os nomes abaixo, que já existem no código:

| Subpasta | Para quê | Exemplo |
|---|---|---|
| `controllers/` · `services/` | Controllers/services secundários do mesmo domínio | `clinics/services/attendants.service.ts` |
| `utils/` | Funções puras (fáceis de testar isoladas) | `availability/utils/compute-slots.ts` |
| `constants/` | Constantes e prompts | `chat/constants/assistant-prompt.ts` |
| `enums/` · `interfaces/` | Enums e interfaces do próprio domínio | `chat/enums/chat-session-type.enum.ts` |
| `guards/` · `decorators/` | Específicos do domínio | `auth/guards/roles.guard.ts` |
| `templates/` | Templates de e-mail | `notifications/templates/` |

### Módulos existentes

| Módulo              | Responsabilidade                                                        |
|---------------------|-------------------------------------------------------------------------|
| `auth`              | Signup, login (padrão e atendente), logout, JWT, `RolesGuard`, cookie de auth |
| `users`             | `UsersService` + `UsersRepository` usados pelo `auth` — **sem controller** |
| `clinics`           | CRUD de clínicas + atendentes (`controllers/` e `services/` de atendentes) |
| `professionals`     | Dois módulos: `ProfessionalsModule` (CRUD) e `ClinicProfessionalsModule` (vínculos clínica↔profissional) |
| `patients`          | Só o schema `Patient` — **sem service/controller**; `auth`, `chat` e `profile` injetam o model |
| `patient-profile`   | Perfil clínico do paciente (anamnese/triagem)                           |
| `appointments`      | Agendamentos: criação, cancelamento e consulta                          |
| `availability`      | Disponibilidade e geração de horários (slots) dos profissionais         |
| `subscriptions`     | Assinaturas e planos das clínicas/profissionais (limites, status)       |
| `chat`              | Chat de triagem com IA (Anthropic via `@ai-sdk/anthropic`)              |
| `search`            | Busca pública de profissionais e clínicas                               |
| `profile`           | Perfil do usuário autenticado (agrega dados de outros módulos)          |
| `cities`            | Lista de cidades via API do IBGE (sem persistência própria)             |
| `notifications`     | Envio de notificações por e-mail (SMTP via nodemailer)                  |
| `geocoding`         | Geocodificação de endereços — módulo global (`@Global`) em `common/geocoding/`, via API externa |
| `redis`             | Conexão Redis — módulo global, sem lógica de negócio                    |

### Onde ficam os schemas Mongoose

O schema `User` vive em `auth/schemas/user.schema.ts` pois é o módulo dono da entidade. Outros módulos que precisam do model `User` importam de lá:

```typescript
import { User, UserDocument } from '../auth/schemas/user.schema';
```

Enums globais (usados por mais de um módulo) ficam em `common/enums/`. Enums de domínio ficam dentro do próprio módulo.

### Coleções do banco (modelos Mongoose)

São **10 coleções ativas**, cada uma definida por um schema registrado como modelo raiz (`MongooseModule.forFeature`). O módulo dono é onde o schema é declarado; outros módulos importam o model dele.

> O MongoDB cria a coleção física apenas no primeiro `insert`. Num banco recém-criado, `show collections` lista só as coleções que já receberam algum documento — pode ser menos de 10 mesmo com os 10 modelos definidos no código. As 10 abaixo são as coleções que o código mapeia.

| Coleção               | Modelo / Schema       | Módulo dono       | Arquivo do schema                                  |
|-----------------------|-----------------------|-------------------|----------------------------------------------------|
| `users`               | `User`                | `auth`            | `auth/schemas/user.schema.ts`                      |
| `clinics`             | `Clinic`              | `clinics`         | `clinics/schemas/clinic.schema.ts`                 |
| `professionals`       | `Professional`        | `professionals`   | `professionals/schemas/professional.schema.ts`     |
| `clinicprofessionals` | `ClinicProfessional`  | `professionals`   | `professionals/schemas/clinic-professional.schema.ts` |
| `patients`            | `Patient`             | `patients`        | `patients/schemas/patient.schema.ts`               |
| `patientprofiles`     | `PatientProfile`      | `patient-profile` | `patient-profile/schemas/patient-profile.schema.ts`|
| `appointments`        | `Appointment`         | `appointments`    | `appointments/schemas/appointment.schema.ts`       |
| `subscriptions`       | `Subscription`        | `subscriptions`   | `subscriptions/schemas/subscription.schema.ts`     |
| `chatsessions`        | `ChatSession`         | `chat`            | `chat/schemas/chat-session.schema.ts`              |
| `chatmessages`        | `ChatMessage`         | `chat`            | `chat/schemas/chat-message.schema.ts`              |

> A coleção `users` usa `collection: 'users'` explícito no `@Schema`; as demais seguem a pluralização padrão do Mongoose sobre o nome do modelo.

Os schemas em `common/schemas/` (`Address`, `AddressForm`, `WeeklySlot`) e os subdocumentos do `patient-profile` são **subdocumentos embutidos** (`@Schema({ _id: false })`) — não geram coleção própria, vivem embutidos nos documentos que os referenciam. Os módulos `availability`, `search`, `profile`, `notifications` e `cities` não possuem coleção própria: apenas leem/agregam modelos de outros módulos (ou dados externos, no caso de `cities`).

---

## Arquitetura do Frontend (`apps/web`)

```
src/
├── main.tsx
├── styles/                   # Tailwind + tema (theme.css, fonts.css)
└── app/
    ├── App.tsx
    ├── routes.tsx            # Todas as rotas + guards por role
    ├── pages/                # Uma página por rota (<Nome>Page.tsx)
    ├── components/           # Layout, modais, topbar, ProtectedRoute
    │   └── ui/               # Primitivos de UI (Radix/shadcn + componentes próprios)
    ├── contexts/AuthContext.tsx
    ├── lib/                  # api.ts (axios + baseURL), hooks, types, format, errors
    └── utils/
```

- Chamadas HTTP passam por `lib/api.ts`; o chat usa `fetch` direto para ler o stream SSE
- Rotas protegidas usam `ProtectedRoute` com `roles`: `patient` (área do paciente), `staff` (`clinic`, `professional`, `attendant`), `clinicOrPro` (`clinic`, `professional`) e `anyAuth`
- Estilo com Tailwind; antes de criar um componente novo, procure um equivalente em `components/ui/`

---

## Convenções de Código

### Nomenclatura

| O quê                  | Padrão               | Exemplo                          |
|------------------------|----------------------|----------------------------------|
| Classes                | PascalCase           | `ClinicsService`                 |
| Métodos e variáveis    | camelCase            | `findByEmail`, `passwordHash`    |
| Arquivos               | kebab-case           | `clinic-professionals.service.ts`|
| Enums (chaves)         | SCREAMING_SNAKE_CASE | `SUBSCRIPTION_STATUS`            |
| Enums (valores)        | lowercase string     | `'active'`, `'patient'`          |
| Constantes             | SCREAMING_SNAKE_CASE | `TOKEN_TTL`, `REDIS_KEY_PREFIX`  |
| Interfaces             | PascalCase + sufixo  | `JwtPayload`, `AuthTokens`       |
| DTOs                   | PascalCase + sufixo  | `CreateClinicDto`, `LoginDto`    |

### Nomes que revelam intenção

Nomes devem descrever o que a variável **é** ou o que o método **faz**, sem abreviações:

```typescript
// Errado
const pwd = await bcrypt.hash(p, 10);
const u = await this.userModel.findOne({ email });

// Correto
const passwordHash = await bcrypt.hash(password, 10);
const existingUser = await this.userModel.findOne({ email });
```

```typescript
// Errado
async get(id: string) { ... }
async check(token: string) { ... }

// Correto
async findById(id: string) { ... }
async validateToken(userId: string, token: string) { ... }
```

### TypeScript

- Tipar sempre o retorno de métodos públicos — nunca deixar inferir `any` implicitamente
- Usar `interface` para formatos de dados externos (payloads, respostas de API)
- Usar `type` para uniões e alias simples
- Usar `enum` para conjuntos fechados de valores de domínio
- Nunca usar `as any` — se a tipagem quebrar, corrija o tipo
- `noImplicitAny: false` está no tsconfig apenas para flexibilidade em testes; no código de produção, tipar explicitamente

### Comentários

Não comentar o que o código já diz. Comentar apenas o **porquê** quando não for óbvio:

```typescript
// Errado: descreve o que o código faz
// Encontra o usuário pelo email
const user = await this.userModel.findOne({ email });

// Correto: explica uma decisão não óbvia
// bcrypt cost 12: balanceia segurança e latência aceitável (<300ms no servidor atual)
const passwordHash = await bcrypt.hash(password, 12);
```

---

## Padrões de Implementação NestJS

### Schema Mongoose

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Clinic {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  subscriptionStatus: SubscriptionStatus;
}

export type ClinicDocument = Clinic & Document;
export const ClinicSchema = SchemaFactory.createForClass(Clinic);
```

- Sempre incluir `{ timestamps: true }` no decorator `@Schema` dos schemas raiz (coleções). Exceções: subdocumentos embutidos usam `{ _id: false }` sem timestamps; `ChatMessage` só tem `createdAt` (mensagem não é editada)
- O type document segue o padrão `<Entidade>Document = <Entidade> & Document`
- Schemas de enums que pertencem a uma única entidade ficam no mesmo arquivo do schema

### DTO com validação

```typescript
import { IsString, IsEmail, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class SignupDto {
  @IsString()
  readonly name: string;

  @IsEmail()
  readonly email: string;

  @IsString()
  @IsOptional()
  readonly username?: string;

  @IsString()
  @MinLength(8)
  readonly password: string;

  @IsEnum(Role)
  readonly role: Role;
}
```

- Todos os campos de DTO são `readonly`
- Campos opcionais usam `?` e `@IsOptional()` juntos
- Validações de formato vêm antes de validações de negócio

### Service

```typescript
@Injectable()
export class ClinicsService {
  constructor(
    @InjectModel(Clinic.name) private readonly clinicModel: Model<ClinicDocument>,
  ) {}

  async findById(id: string): Promise<ClinicDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid clinic ID: ${id}`);
    }

    const clinic = await this.clinicModel.findById(id).exec();
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${id} not found`);
    }
    return clinic;
  }
}
```

- Validar IDs do MongoDB antes de consultar (`Types.ObjectId.isValid`)
- Lançar exceções específicas do NestJS (`NotFoundException`, `ConflictException`, etc.)
- Mensagens de erro descrevem o ID ou campo problemático

### Controller

```typescript
@Controller('clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ClinicDocument> {
    return this.clinicsService.findById(id);
  }
}
```

- Controllers não contêm lógica de negócio — apenas recebem, delegam e retornam
- Usar `@HttpCode` explícito quando o status não é o padrão do método HTTP

### Module

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Clinic.name, schema: ClinicSchema }]),
  ],
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
```

- Exportar o service apenas se outros módulos precisarem consumi-lo diretamente

---

## Autenticação — Regras de Negócio

Documentadas aqui para que agentes não as violem ao gerar código:

| Regra | Detalhe |
|-------|---------|
| `passwordHash` | Campo sempre chamado `passwordHash`, nunca `password`, no banco |
| bcrypt cost | Sempre 12 |
| Token TTL | 7 dias (604800 segundos) |
| Validação dupla | JWT válido **e** token presente no Redis — logout invalida o token imediatamente |
| Roles | `patient`, `clinic`, `professional`, `attendant` (enum `Role` em `common/enums/role.enum.ts`) |
| Login padrão | `email` + `password` (roles: patient, clinic, professional) |
| Login atendente | `clinicId` + `username` + `password` (role: attendant) |
| Signup | Cria o usuário e já retorna o token (auto-login) |
| `role` é imutável | Definido no cadastro, nunca alterado depois |
| `passwordHash` fora das consultas | `select: false` no schema; só o login pede com `.select('+passwordHash')` |
| Limite de requisições | Por IP (`CF-Connecting-IP` atrás do Cloudflare), em `common/throttle/`: 120/min geral, login 10/min, cadastro 5 a cada 10 min, chat 20 mensagens/min. Desligado em `NODE_ENV=test` |

---

## Testes

### O que testar e como

| Tipo | Quando usar | Exemplo |
|------|------------|---------|
| Unitário | Lógica de service isolada | `auth.service.spec.ts` |
| E2E | Fluxo HTTP completo | `auth.e2e.spec.ts` |

Todos os testes (unitários e E2E) ficam em `<modulo>/tests/` e terminam em `.spec.ts` — o Jest roda tudo a partir de `src/`. Nos testes, `@medicano/types` aponta direto para `packages/types/src` (não precisa buildar o pacote).

### Padrão de teste unitário

```typescript
describe('ClinicsService', () => {
  let clinicsService: ClinicsService;

  const mockClinicModel = {
    findById: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicsService,
        { provide: getModelToken(Clinic.name), useValue: mockClinicModel },
      ],
    }).compile();

    clinicsService = module.get<ClinicsService>(ClinicsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findById', () => {
    it('should return the clinic when found', async () => {
      const clinicId = new Types.ObjectId().toString();
      mockClinicModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ name: 'Clínica A' }) });

      const result = await clinicsService.findById(clinicId);

      expect(result).toEqual({ name: 'Clínica A' });
    });

    it('should throw NotFoundException for invalid ObjectId', async () => {
      await expect(clinicsService.findById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### O que nunca fazer nos testes

- Não testar implementação — testar comportamento observável
- Não deixar mocks que passam em casos que a implementação real quebraria
- Não omitir `afterEach(() => jest.clearAllMocks())` — mocks sujos causam falsos positivos

### Verificação antes de commitar

Não há hook de pre-commit: quem barra erro de tipo ou teste quebrado é o CI. Rode antes de commitar:

```bash
# Dentro de apps/api
npx tsc -p tsconfig.build.json --noEmit   # Apenas código de produção
npx tsc --noEmit                           # Código de produção + testes
npm test                                   # Roda os testes

# Dentro de apps/web
npm run lint
npm run build
```

---

## O que Nunca Fazer

- **Nunca** criar um arquivo fora da estrutura de módulo definida acima
- **Nunca** duplicar um schema ou service em pastas diferentes
- **Nunca** importar um schema de um caminho relativo diferente do canonical (`auth/schemas/user.schema`)
- **Nunca** usar `password` como nome de campo no banco — sempre `passwordHash`
- **Nunca** commitar com erros de TypeScript — o CI reprova e o staging não é publicado
- **Nunca** adicionar lógica de negócio no controller
- **Nunca** criar um módulo sem definir o que ele exporta no `@Module`
- **Nunca** usar `any` explicitamente no código de produção

---

## Instruções para Agentes de IA

### Antes de implementar qualquer coisa

1. Leia este documento inteiro
2. Liste os arquivos do módulo relacionado com `find apps/api/src/<modulo> -type f`
3. Confirme os imports canônicos (especialmente para `User`, `Role`, `RedisService`)
4. Verifique se o módulo já existe antes de criar um novo
5. Identifique se a feature precisa de novo módulo ou se encaixa em um existente

### Ao implementar

- Implemente cada arquivo completo — sem `// TODO`, sem `// ...`
- Siga rigorosamente a estrutura de pastas definida neste documento
- Ao criar um service, implemente também o module e o controller correspondentes
- Ao criar um schema, atualize o `app.module.ts` se necessário
- Nomeie variáveis conforme as convenções deste documento — nunca use `data`, `obj`, `res`, `val` como nomes de variável
- Ao usar o modelo Mongoose em testes, use constructor function mock (não object literal):

```typescript
function MockUserModel(this: any, dto: any) {
  Object.assign(this, { ...dto, _id: { toString: () => 'mock-id' }, save: mockSave });
}
MockUserModel.findOne = jest.fn();
```

### Antes de entregar

Verifique obrigatoriamente:

- [ ] Todos os arquivos novos seguem a estrutura de módulo definida aqui
- [ ] Nenhum campo de senha está sendo salvo como `password` (deve ser `passwordHash`)
- [ ] `app.module.ts` foi atualizado com módulos novos
- [ ] Sem imports quebrados (caminho canônico do `User` é `auth/schemas/user.schema`)
- [ ] `tsc --noEmit` passaria sem erros (e `npm run lint` + `npm run build` no web, se mexeu nele)
- [ ] Regras de negócio da seção de autenticação não foram violadas
