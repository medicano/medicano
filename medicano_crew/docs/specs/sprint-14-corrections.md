# Sprint 14 — Correções Pós-Auditoria

## Objetivo

Esta sprint corrige todas as divergências encontradas entre o código implementado e a documentação das sprints 01–12, **com exceção da migração de streaming do chat (Sprint 13, já especificada)**. Nenhuma feature nova é introduzida.

## Por que esta sprint existe

Uma auditoria completa do código contra as specs revelou **sete divergências**, descritas abaixo.

| Divergência | Gravidade |
|---|---|
| `Specialty` enum tem 8 valores com casing inconsistente (mistura uppercase e lowercase) | Alta |
| Subscriptions: planos com nomes errados (`BASIC`/`PREMIUM` em vez de `FREE`/`BASIC`/`PRO`), schema orientado por `userId` em vez de `clinicId`, limites desnormalizados no documento | Alta |
| Clinic schema sem `cnpj`, `autoConfirm`, `minCancelNoticeHours`, `weeklySlots` | Alta |
| Professional schema: `crm?` (opcional) em vez de `registration` (obrigatório); sem `cpf` (obrigatório, único); `weeklySlots` com schema inline sem `slotDurationMinutes`; sem `minCancelNoticeHours` | Alta |
| `AttendantsService` e `AttendantsController` existem no disco mas não estão registrados no `ClinicsModule` — endpoints retornam 404 | Alta |
| `NotificationsService` existe mas não é chamado por `AppointmentsService` — nenhum e-mail é enviado | Média |
| `SearchService.search()` não filtra profissionais por assinatura ativa (RN20) | Baixa |

## Dependências

- Sprints 01–12 devem ter sido executadas
- Sprint 13 é independente e pode rodar antes ou depois desta

## Escopo de alterações

| Módulo | Arquivos afetados |
|---|---|
| `common/` | `specialty.enum.ts` |
| `chat/` | `constants/triage-prompt.ts` |
| `subscriptions/` | `constants/subscription.constants.ts`, `schemas/subscription.schema.ts`, `subscriptions.service.ts`, `dto/create-subscription.dto.ts`, `dto/update-subscription.dto.ts` |
| `clinics/` | `schemas/clinic.schema.ts`, `dto/create-clinic.dto.ts`, `dto/update-clinic.dto.ts`, `clinics.module.ts` |
| `professionals/` | `schemas/professional.schema.ts`, `dto/create-professional.dto.ts`, `dto/update-professional.dto.ts` |
| `appointments/` | `appointments.service.ts`, `appointments.module.ts` |
| `search/` | `search.service.ts` |
| Testes | Ver seção de testes |

---

## Especificações detalhadas

### Seção A — Specialty enum

**Arquivo:** `apps/api/src/common/enums/specialty.enum.ts`

Substituir os 8 valores atuais (com casing inconsistente) pelos 5 valores lowercase uniformes definidos no TCC:

```typescript
export enum Specialty {
  MEDICINE = 'medicine',
  PSYCHOLOGY = 'psychology',
  PSYCHIATRY = 'psychiatry',
  DENTISTRY = 'dentistry',
  NUTRITION = 'nutrition',
}
```

**Arquivo:** `apps/api/src/chat/constants/triage-prompt.ts`

Reescrever o arquivo para usar somente as 5 especialidades. O arquivo atual constrói o prompt dinamicamente a partir do enum, mas referencia valores como `Specialty.GENERAL_PRACTICE`, `Specialty.CARDIOLOGY` etc., que deixarão de existir. Reescrever as descrições caso a caso para as 5 especialidades restantes:

- `medicine`: Consultas de rotina, sintomas gerais, febre, gripe, dores em geral
- `psychology`: Acompanhamento psicológico, terapia, apoio emocional
- `psychiatry`: Saúde mental, ansiedade, depressão, transtornos do sono
- `dentistry`: Saúde bucal, dores de dente, problemas com gengivas, ortodontia
- `nutrition`: Orientação alimentar, dietas, emagrecimento, doenças metabólicas

O `specialtyLabels` e a lista dinâmica devem ser atualizados para refletir apenas esses 5 valores.

---

### Seção B — Subscription plans e schema

**Problema 1 — planos errados:** O código atual tem `BASIC`/`PREMIUM`. A spec exige `FREE`/`BASIC`/`PRO`.

**Problema 2 — chave errada:** O schema usa `userId` para identificar o dono da assinatura. A spec (Sprint 04) e a integração no `ClinicProfessionalsService` passam `clinicId`. Há um bug silencioso: `enforceClinicProfessionalLimit(clinicId, count)` passa um `clinicId` mas o service consulta por `userId` — logo nunca encontra a assinatura.

**Problema 3 — schema desnormalizado:** Os campos `clinicLimit`, `professionalLimit`, `appointmentLimit`, `aiTriageEnabled`, `prioritySupport` são copiados do plano para dentro do documento. A spec não prevê isso — os limites devem ser derivados do plano em runtime.

**Arquivo:** `apps/api/src/subscriptions/constants/subscription.constants.ts`

```typescript
export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
}

export const PLAN_PROFESSIONAL_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 2,
  [SubscriptionPlan.BASIC]: 10,
  [SubscriptionPlan.PRO]: -1, // -1 = ilimitado
};
```

**Arquivo:** `apps/api/src/subscriptions/schemas/subscription.schema.ts`

```typescript
export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true, unique: true })
  clinicId: Types.ObjectId;

  @Prop({ type: String, enum: SubscriptionPlan, default: SubscriptionPlan.FREE })
  plan: SubscriptionPlan;

  @Prop({ type: String, enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  status: SubscriptionStatus;

  @Prop({ type: Date })
  expiresAt?: Date;
}
```

Remover todos os campos desnormalizados (`clinicLimit`, `professionalLimit`, `appointmentLimit`, `aiTriageEnabled`, `prioritySupport`, `isActive`, `userId`).

**Arquivo:** `apps/api/src/subscriptions/subscriptions.service.ts`

Atualizar todos os métodos para usar `clinicId` como chave primária. Simplificar `create` — não mais copiar limites para o documento. Reescrever `enforceClinicProfessionalLimit(clinicId, currentCount)`:

```typescript
async enforceClinicProfessionalLimit(clinicId: string, currentCount: number): Promise<void> {
  const subscription = await this.findByClinicId(clinicId);
  const plan = subscription?.plan ?? SubscriptionPlan.FREE;
  const limit = PLAN_PROFESSIONAL_LIMITS[plan];
  if (limit !== -1 && currentCount >= limit) {
    throw new ForbiddenException(
      `Professional limit of ${limit} reached for plan ${plan}`,
    );
  }
}
```

Renomear `findByUserId` para `findByClinicId`. Remover `hasReachedClinicLimit` e `getActivePlan` se não forem usados externamente.

**Arquivos:** `dto/create-subscription.dto.ts`, `dto/update-subscription.dto.ts`

Atualizar para usar `SubscriptionPlan` (FREE/BASIC/PRO) e `SubscriptionStatus`. O DTO de criação deve aceitar `clinicId` em vez de ser inferido do userId. Remover campos de limites desnormalizados.

---

### Seção C — Clinic schema

**Arquivo:** `apps/api/src/clinics/schemas/clinic.schema.ts`

Adicionar ao schema existente (sem remover campos já presentes):

```typescript
@Prop({ type: String, required: true, unique: true, match: /^\d{14}$/ })
cnpj: string;

@Prop({ type: Boolean, default: false })
autoConfirm: boolean;

@Prop({ type: Number, default: 24, min: 0, max: 168 })
minCancelNoticeHours: number;

@Prop({ type: [WeeklySlotSchema], default: [] })
weeklySlots: WeeklySlot[];
```

Adicionar índice único para `cnpj`:
```typescript
ClinicSchema.index({ cnpj: 1 }, { unique: true });
```

Importar `WeeklySlot` e `WeeklySlotSchema` de `../../common/schemas/weekly-slot.schema`.

**Arquivo:** `apps/api/src/clinics/dto/create-clinic.dto.ts`

Adicionar:

```typescript
@IsString()
@Matches(/^\d{14}$/, { message: 'CNPJ must be exactly 14 digits' })
readonly cnpj: string;

@IsBoolean()
@IsOptional()
readonly autoConfirm?: boolean;

@IsInt()
@Min(0)
@Max(168)
@IsOptional()
readonly minCancelNoticeHours?: number;

@IsArray()
@ValidateNested({ each: true })
@Type(() => WeeklySlotDto)
@IsOptional()
readonly weeklySlots?: WeeklySlotDto[];
```

**Arquivo:** `apps/api/src/clinics/dto/update-clinic.dto.ts`

Adicionar os mesmos campos, todos `@IsOptional()`.

---

### Seção D — Professional schema

**Arquivo:** `apps/api/src/professionals/schemas/professional.schema.ts`

Aplicar as seguintes correções:

1. Renomear `crm?: string` (opcional) para `registration: string` (obrigatório)
2. Adicionar `cpf: string` (obrigatório, único)
3. Adicionar `minCancelNoticeHours: number` (default 24, min 0, max 168)
4. Substituir o `weeklySlots` inline por `WeeklySlot[]` usando o `WeeklySlotSchema` de `common/schemas/weekly-slot.schema`
5. Adicionar índices: `{ cpf: 1 }` único

Schema resultante (apenas os campos alterados/adicionados — manter os demais):

```typescript
@Prop({ type: String, required: true })
registration: string;  // era crm?: string

@Prop({ type: String, required: true, unique: true })
cpf: string;

@Prop({ type: Number, default: 24, min: 0, max: 168 })
minCancelNoticeHours: number;

@Prop({ type: [WeeklySlotSchema], default: [] })
weeklySlots: WeeklySlot[];  // substituir o array inline atual
```

Adicionar índices:
```typescript
ProfessionalSchema.index({ cpf: 1 }, { unique: true });
ProfessionalSchema.index({ 'address.city': 1, specialty: 1 });
```

**Arquivo:** `apps/api/src/professionals/dto/create-professional.dto.ts`

Renomear `crm?` para `registration` (obrigatório, sem `@IsOptional()`). Adicionar `cpf` (obrigatório, `@Matches(/^\d{11}$/)`). Adicionar `minCancelNoticeHours?` (opcional, `@IsInt @Min(0) @Max(168)`). Remover `bio?` se não estiver no schema definitivo.

**Arquivo:** `apps/api/src/professionals/dto/update-professional.dto.ts`

Mesmas adições, todos opcionais.

---

### Seção E — Registrar Attendants no ClinicsModule

**Arquivo:** `apps/api/src/clinics/clinics.module.ts`

O `AttendantsService` injeta `Model<UserDocument>` (schema `User`) e `ClinicsService`. O `AttendantsController` depende do `AttendantsService`.

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Clinic.name, schema: ClinicSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ClinicsController, AttendantsController],
  providers: [ClinicsService, AttendantsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
```

Importar `User` e `UserSchema` de `../auth/schemas/user.schema`.

---

### Seção F — Integrar NotificationsService no AppointmentsService

**Arquivo:** `apps/api/src/appointments/appointments.service.ts`

Injetar `NotificationsService` no construtor e chamar os métodos de notificação nos pontos corretos:

- Após `create()` e `createAppointment()` salvarem com sucesso: `this.notificationsService.notifyAppointmentCreated(appointment)`
- Em `updateStatus()`, após salvar:
  - Se novo status é `CONFIRMED`: chamar `notifyAppointmentConfirmed`
  - Se novo status é `CANCELLED`: chamar `notifyAppointmentCancelled(appointment, 'provider')`
- Em `cancel()`, após salvar: `notifyAppointmentCancelled(appointment, 'patient')`

As chamadas de notificação **não devem lançar erro** — se falharem, apenas logar (o `NotificationsService` já faz isso internamente com `try/catch`).

**Arquivo:** `apps/api/src/appointments/appointments.module.ts`

Importar `NotificationsModule` e adicionar ao array `imports`.

---

### Seção G — Search RN20: filtrar por assinatura ativa

**Arquivo:** `apps/api/src/search/search.service.ts`

Injetar `Model<SubscriptionDocument>` no construtor. Em `search()`, após buscar os profissionais, filtrar para retornar apenas aqueles cujo `clinicId` (via `ClinicProfessional`) tem uma assinatura com `status` diferente de `'inactive'`.

Implementação pragmática: consultar os IDs das clínicas com assinatura ativa/trial e usar esses IDs para filtrar os `ClinicProfessional` e, por consequência, os `Professional`.

Se um profissional não estiver vinculado a nenhuma clínica, ele **não** deve aparecer na busca (RN20 implica que a visibilidade depende de estar vinculado a uma clínica com plano válido).

Adicionar `MongooseModule.forFeature([Subscription])` ao `SearchModule`.

---

## Atualização de testes

Os seguintes arquivos de teste devem ser atualizados após as alterações acima:

| Arquivo | O que muda |
|---|---|
| `subscriptions/tests/subscriptions.service.spec.ts` | Usar novos planos FREE/BASIC/PRO; substituir `userId` por `clinicId`; remover campos desnormalizados dos fixtures |
| `clinics/tests/attendants.service.spec.ts` | Verificar que os testes passam com o module atualizado |
| `professionals/tests/` (se existir) | Fixtures com `cpf` e `registration` obrigatórios |
| `search/tests/search.service.spec.ts` | Mockar `subscriptionModel` se existir; garantir que profissionais sem assinatura ativa não aparecem |
| `appointments/tests/appointments.service.spec.ts` | Mockar `notificationsService`; adicionar asserções de que `notifyAppointmentCreated` é chamado |

---

## Nota de migração

Esta sprint introduz **breaking changes** nos schemas:

- `Subscription.userId` → `clinicId`; campos desnormalizados removidos
- `Professional.crm` → `registration` (obrigatório); `cpf` adicionado (obrigatório)
- `Clinic` ganha `cnpj` (obrigatório, único)
- `Specialty` enum: valores antigos (`GENERAL_PRACTICE`, `CARDIOLOGY` etc.) deixam de existir

Documentos existentes em banco de desenvolvimento devem ser descartados e recriados.

## Definition of Done

- [ ] `Specialty` enum tem exatamente 5 valores lowercase: `medicine`, `psychology`, `psychiatry`, `dentistry`, `nutrition`
- [ ] Triage prompt menciona apenas as 5 especialidades com descrições corretas
- [ ] `SubscriptionPlan` tem `FREE`/`BASIC`/`PRO`; schema usa `clinicId`; sem campos desnormalizados
- [ ] `enforceClinicProfessionalLimit` defaults para FREE (limite 2) quando não há assinatura; trata `-1` como ilimitado
- [ ] Clinic schema tem `cnpj` (required, unique), `autoConfirm`, `minCancelNoticeHours`, `weeklySlots`
- [ ] Professional schema tem `cpf` (required, unique), `registration` (required), `minCancelNoticeHours`, `weeklySlots: WeeklySlot[]`
- [ ] Endpoints `POST/GET/PUT/DELETE /clinics/:clinicId/attendants` funcionam (módulo registrado)
- [ ] `AppointmentsService` chama `NotificationsService` ao criar, confirmar e cancelar agendamentos
- [ ] `SearchService.search()` retorna apenas profissionais vinculados a clínicas com assinatura ativa ou trial
- [ ] Todos os testes afetados passam
- [ ] `tsc --noEmit` passa sem erros em `apps/api`
