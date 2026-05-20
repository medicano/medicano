# Medicano — Guia de Desenvolvimento

Plataforma de gestão de clínicas e agendamentos médicos.

Este documento é a fonte de verdade para qualquer agente de IA (Claude Code, CrewAI) ou desenvolvedor que trabalhe neste projeto. Leia-o completamente antes de escrever qualquer linha de código.

---

## Estrutura do Monorepo

```
medicano-project/
├── apps/
│   ├── api/                  # Backend NestJS
│   └── web/                  # Frontend React (Vite)
├── packages/
│   └── types/                # Tipos TypeScript compartilhados entre apps
├── medicano_crew/            # Automação de desenvolvimento com CrewAI
│   ├── src/medicano_crew/
│   │   ├── crews/            # Crews do flow (architect, developer, reviewer...)
│   │   ├── main.py           # Orquestração do flow
│   │   └── run_sprint.py     # Executor de sprints em lote
│   └── docs/specs/           # Especificações e prompts de cada sprint
├── CLAUDE.md                 # Este arquivo
└── README.md
```

---

## Como Rodar o Projeto

### Pré-requisitos

- Node.js 20+
- Docker (MongoDB + Redis)
- AWS CLI configurado (`aws configure` ou AWS SSO) com acesso ao Secrets Manager

### Infraestrutura local

```bash
sudo docker compose up -d   # sobe MongoDB (27017) e Redis (6379)
```

### API (`apps/api`)

A API busca toda a configuração do AWS Secrets Manager — não há `.env`. O secret é selecionado pelo `NODE_ENV`:

| Ambiente | Secret buscado | Comando |
|---|---|---|
| Development | `medicano/api/development` | `npm run start:dev` |
| Staging | `medicano/api/staging` | `npm run start:staging` |
| Production | `medicano/api/production` | `npm run start:prod` |

Cada secret é um JSON no formato:

```json
{
  "MONGODB_URI": "mongodb://...",
  "REDIS_HOST": "...",
  "REDIS_PORT": "6379",
  "JWT_SECRET": "..."
}
```

A região AWS é lida de `AWS_REGION` (default: `sa-east-1`).

### Testes

```bash
cd apps/api
npm test          # unitários + E2E (requer MongoDB e Redis rodando)
```

Os testes rodam com `NODE_ENV=test`. Nesse ambiente, `loadAwsSecrets` não chama a AWS — retorna config local hardcoded apontando para o Docker local (`mongodb://localhost:27017/medicano-test`, Redis em `localhost`).

---

## Stack Completa

| Camada       | Tecnologia                                          |
|--------------|-----------------------------------------------------|
| Backend      | NestJS 11 · TypeScript 5 · class-validator          |
| Banco        | MongoDB (Mongoose 9)                                |
| Cache/Sessão | Redis (ioredis 5) — tokens JWT revogáveis           |
| Auth         | Passport.js · passport-jwt · bcrypt (cost 12)      |
| Frontend     | React · Vite · TypeScript                           |
| Automação    | CrewAI · Aider                                      |
| Testes       | Jest · ts-jest · @nestjs/testing                    |
| Package mgr  | npm (Node) · uv (Python)                            |

---

## Arquitetura do Backend (`apps/api`)

### Estrutura de pastas

Cada domínio de negócio é um módulo NestJS independente. A estrutura interna de cada módulo é sempre a mesma:

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
│   ├── decorators/           # Decorators reutilizáveis (@CurrentUser, etc.)
│   ├── enums/                # Enums globais (role.enum.ts)
│   └── filters/              # Filtros de exceção globais
├── redis/
│   ├── redis.module.ts       # Global, exporta RedisService
│   └── redis.service.ts
└── app.module.ts
```

### Módulos existentes

| Módulo              | Responsabilidade                                    |
|---------------------|-----------------------------------------------------|
| `auth`              | Signup, login (padrão e atendente), logout, JWT     |
| `users`             | CRUD de usuários (admin)                            |
| `clinics`           | CRUD de clínicas                                    |
| `professionals`     | CRUD de profissionais                               |
| `redis`             | Conexão Redis — módulo global, sem lógica de negócio |

### Onde ficam os schemas Mongoose

O schema `User` vive em `auth/schemas/user.schema.ts` pois é o módulo dono da entidade. Outros módulos que precisam do model `User` importam de lá:

```typescript
import { User, UserDocument } from '../auth/schemas/user.schema';
```

Enums globais (usados por mais de um módulo) ficam em `common/enums/`. Enums de domínio ficam dentro do próprio módulo.

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

- Sempre incluir `{ timestamps: true }` no decorator `@Schema`
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

---

## Testes

### O que testar e como

| Tipo | Quando usar | Exemplo |
|------|------------|---------|
| Unitário | Lógica de service isolada | `auth.service.spec.ts` |
| E2E | Fluxo HTTP completo | `auth.e2e.spec.ts` |

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

O hook de pre-commit roda `tsc --noEmit` automaticamente. Para rodar manualmente:

```bash
# Dentro de apps/api
npx tsc -p tsconfig.build.json --noEmit   # Apenas código de produção
npx tsc --noEmit                           # Código de produção + testes
npm test                                   # Roda os testes
```

---

## O que Nunca Fazer

- **Nunca** criar um arquivo fora da estrutura de módulo definida acima
- **Nunca** duplicar um schema ou service em pastas diferentes
- **Nunca** importar um schema de um caminho relativo diferente do canonical (`auth/schemas/user.schema`)
- **Nunca** usar `password` como nome de campo no banco — sempre `passwordHash`
- **Nunca** commitar com erros de TypeScript — o hook bloqueia, mas corrija antes de tentar
- **Nunca** adicionar lógica de negócio no controller
- **Nunca** criar um módulo sem definir o que ele exporta no `@Module`
- **Nunca** usar `any` explicitamente no código de produção

---

## Instruções para Agentes CrewAI

> Esta seção é lida pelos agentes `Architect`, `Developer`, `Documenter` e `Reviewer` do flow em `medicano_crew/`.

### Antes de implementar qualquer coisa

1. Leia este documento inteiro
2. Liste os arquivos do módulo relacionado com `find apps/api/src/<modulo> -type f`
3. Confirme os imports canônicos (especialmente para `User`, `Role`, `RedisService`)
4. Verifique se o módulo já existe antes de criar um novo

### Architect

- Defina a estrutura completa de arquivos antes de qualquer código
- Especifique os imports entre módulos explicitamente
- Identifique se a feature precisa de novo módulo ou se encaixa em um existente
- Documente as regras de negócio novas no plano técnico, não apenas no código

### Developer

- Implemente cada arquivo completo — sem `// TODO`, sem `// ...`
- Siga rigorosamente a estrutura de pastas definida neste documento
- Ao criar um service, implemente também o module e o controller correspondentes
- Ao criar um schema, atualize o `app.module.ts` se necessário
- Nomeie variáveis conforme as convenções desta seção — nunca use `data`, `obj`, `res`, `val` como nomes de variável
- Ao usar o modelo Mongoose em testes, use constructor function mock (não object literal):

```typescript
function MockUserModel(this: any, dto: any) {
  Object.assign(this, { ...dto, _id: { toString: () => 'mock-id' }, save: mockSave });
}
MockUserModel.findOne = jest.fn();
```

### Reviewer

Verifique obrigatoriamente:

- [ ] Todos os arquivos novos seguem a estrutura de módulo definida aqui
- [ ] Nenhum campo de senha está sendo salvo como `password` (deve ser `passwordHash`)
- [ ] `app.module.ts` foi atualizado com módulos novos
- [ ] Sem imports quebrados (caminho canônico do `User` é `auth/schemas/user.schema`)
- [ ] `tsc --noEmit` passaria sem erros
- [ ] Regras de negócio da seção de autenticação não foram violadas

### Formato de output do Developer para o Aider

O Developer gera blocos no formato que o Aider entende:

```
apps/api/src/clinics/clinics.service.ts
\`\`\`typescript
<conteúdo completo do arquivo>
\`\`\`
```

Nunca gerar arquivos parciais. Sempre o conteúdo completo do arquivo.
