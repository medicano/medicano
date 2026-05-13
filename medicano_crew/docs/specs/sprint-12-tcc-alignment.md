# Sprint 12 — TCC Alignment & Final Corrections

## Objective

This is the **final corrective sprint** before TCC submission. It aligns every divergence between the implemented code and the documentation, ensuring:

1. The `Specialty` enum lists all 5 specialties referenced in the TCC (RF03, abstract, justification)
2. The `Subscription` plans are renamed to match the documentation (FREE / BASIC / PRO with limits 2 / 10 / unlimited)
3. The `Clinic` schema has the documentation-required fields (CNPJ, structured address, specialties, autoConfirm, minCancelNoticeHours, linkedScheduling, description)
4. The `Professional` schema has the documentation-required fields (CPF, registration, structured address, scheduling config, description)
5. The `Specialty` enum is actually used as the type for `Professional.specialty` and `Clinic.specialties[]`
6. The `linkedScheduling` flag (RN03, RN25) is enforced in `AppointmentsService.checkConflict`
7. The availability query DTO supports a date range (`fromDate` + `toDate`) instead of a single day, enabling weekly calendar views
8. The `User.displayName` and `User.isActive` fields exist as required by the attendants module (Sprint 10)
9. The `enforceClinicProfessionalLimit` integration in `ClinicProfessionalsService.assignProfessionalToClinic` uses the new plan names
10. The shared types in `packages/types` reflect every schema change

## Why this sprint exists

After auditing the implemented code against the TCC and the original sprint specifications, **eight divergences** were identified:

| Divergence | Severity | TCC reference |
|---|---|---|
| `Specialty` enum has only 3 values (missing PSYCHIATRY, DENTISTRY) | High | Abstract; Justification §1.2; RF03 |
| Subscription plans named BASIC/PROFESSIONAL/ENTERPRISE with limits 1/5/Infinity instead of FREE/BASIC/PRO with 2/10/unlimited | High | Sprint 04 spec; RF42-RF44 |
| `Clinic` missing CNPJ, structured address, specialties[], autoConfirm, minCancelNoticeHours, linkedScheduling, description | High | RF14, RF18, RF19, RF23, RF25, RN25 |
| `Professional` missing CPF, registration, structured address, autoConfirm, minCancelNoticeHours, phone, description; specialty is `string` instead of `Specialty` enum | High | RF26, RF28, RF29, RF34 |
| `linkedScheduling` not enforced in conflict logic — DTO exists but field is missing from schema and service | High | RN03, RN25 |
| `GetAvailabilityQueryDto` accepts only a single `date`, not a range | Medium | RF20 weekly view |
| `User.displayName` and `User.isActive` fields don't exist — `AttendantsService.createAttendant` writes them but they're not declared | High (silent data loss) | Sprint 10 spec |
| Shared types package not updated for any of the above | Medium | Sprint 06, 08, 10 specs |

## Dependencies

- All previous sprints (1–11) must have been executed already
- This is purely corrective — no new business features are introduced

## Scope of Changes

This sprint touches the following modules:

- `common/` — Specialty enum (extension)
- `auth/` — User schema (add displayName, isActive)
- `clinics/` — Clinic schema, DTOs, service
- `professionals/` — Professional schema, DTOs, service, ClinicProfessionalsService
- `appointments/` — checkConflict logic for linkedScheduling
- `availability/` — GetAvailabilityQueryDto extension to range
- `subscriptions/` — Plan rename, limit constants update
- `search/` — Use new specialty enum values in filters (no breaking change)
- `packages/types` — Update IUser, IClinic, IProfessional, ISubscription interfaces

## Out of Scope

- Frontend changes (separate concern)
- New features (this is corrective only)
- Data migration scripts (development databases will be reset; production is academic)
- Logo / branding assets

## Detailed Specifications

### Section A — Specialty enum extension

Current `apps/api/src/common/enums/specialty.enum.ts` has only `MEDICINE`, `PSYCHOLOGY`, `NUTRITION`. Extend to match TCC abstract:

```typescript
export enum Specialty {
  MEDICINE = 'medicine',
  PSYCHOLOGY = 'psychology',
  PSYCHIATRY = 'psychiatry',
  DENTISTRY = 'dentistry',
  NUTRITION = 'nutrition',
}
```

Also update the triage prompt at `apps/api/src/chat/constants/triage-prompt.ts` so that the LLM is instructed about all 5 specialties, not 3.

### Section B — Subscription plans rename

Current `apps/api/src/subscriptions/schemas/subscription.schema.ts`:

```typescript
// CURRENT (wrong):
export enum SubscriptionPlan {
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}
export const PLAN_PROFESSIONAL_LIMITS = {
  BASIC: 1,
  PROFESSIONAL: 5,
  ENTERPRISE: Infinity,
};
```

Replace with the values from the original Sprint 04 spec and the TCC documentation:

```typescript
// NEW (correct):
export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
}
export const PLAN_PROFESSIONAL_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 2,
  [SubscriptionPlan.BASIC]: 10,
  [SubscriptionPlan.PRO]: -1, // -1 means unlimited
};
```

Update `enforceClinicProfessionalLimit` in `subscriptions.service.ts` to use the new plan keys and to treat `-1` as "no limit".

Update any test data, fixtures or constants that still reference the old plan names.

### Section C — Clinic schema enrichment

The `Clinic` schema currently has:

```typescript
{ name, email, phone, address (string), userId?, subscriptionStatus? }
```

Replace with the full documented shape:

```typescript
{
  name: string,                       // required
  cnpj: string,                       // required, unique, 14 digits — RF14
  email: string,                      // required
  phone: string,                      // required
  address: Address (subdocument),     // required — replaces the string field
  specialties: Specialty[],           // required, min 1 item — RF14
  description?: string,               // optional, max 1000 chars
  userId?: ObjectId,                  // existing
  subscriptionStatus?: SubscriptionStatus, // existing
  weeklySlots: WeeklySlot[],          // default [] — RF18
  autoConfirm: boolean,               // default false — RF19, RN06
  minCancelNoticeHours: number,       // default 24, min 0, max 168 — RF23, RN08
  linkedScheduling: boolean,          // default false — RF25, RN25
}
```

Add indexes:

```typescript
ClinicSchema.index({ cnpj: 1 }, { unique: true });
ClinicSchema.index({ 'address.city': 1, specialties: 1 });
```

Update `CreateClinicDto` and `UpdateClinicDto` to validate every new field with `class-validator`. Use `@ValidateNested` + `@Type(() => AddressDto)` for the address.

### Section D — Professional schema enrichment

The `Professional` schema currently has:

```typescript
{ specialty: string, userId, name?, address? (string), weeklySlots? }
```

Replace with the full documented shape:

```typescript
{
  userId: ObjectId,                   // existing
  specialty: Specialty,               // changed from string to enum — RF26
  name: string,                       // required (was optional)
  cpf: string,                        // required, unique, 11 digits — RF26
  registration: string,               // required (e.g. 'CRM/SP 123456') — RF26
  address: Address (subdocument),     // required — replaces the string field
  phone?: string,                     // optional
  description?: string,               // optional, max 1000 chars
  weeklySlots: WeeklySlot[],          // default []
  autoConfirm: boolean,               // default false — RF29, RN06
  minCancelNoticeHours: number,       // default 24, min 0, max 168 — RF34, RN08
}
```

Add indexes:

```typescript
ProfessionalSchema.index({ cpf: 1 }, { unique: true });
ProfessionalSchema.index({ 'address.city': 1, specialty: 1 });
```

Update `CreateProfessionalDto` and `UpdateProfessionalDto` accordingly. The DTOs currently only have `specialty` (string) and `userId` — they need every new field added with proper validators.

### Section E — User schema: displayName and isActive

`AttendantsService.createAttendant` writes `displayName` and `isActive` when creating attendants, but these fields are not declared in the schema. Mongoose silently drops them under strict mode (default).

Add both to `apps/api/src/auth/schemas/user.schema.ts`:

```typescript
@Prop({ type: String })
displayName?: string;

@Prop({ type: Boolean, default: true })
isActive: boolean;
```

### Section F — linkedScheduling enforcement

The DTO `update-linked-scheduling.dto.ts` already exists, but the field is not in the schema (Section C fixes this) and the conflict logic doesn't honor it.

Update `AppointmentsService.checkConflict` to take `clinicId` as an additional parameter and load the clinic to read `linkedScheduling`:

- If `linkedScheduling === true` AND the conflicting appointment is at the same clinic AND only adjacency exists (boundaries touch but no overlap) → allow
- Otherwise → behave as today (throw ConflictException on any overlap or adjacency)

Practically, the cleanest implementation is:

- `linkedScheduling=true`: query for STRICT overlap (`startAt < endAt && endAt > startAt`) — touching is allowed
- `linkedScheduling=false`: query for overlap OR adjacency (`startAt <= endAt && endAt >= startAt`) — touching is blocked

The current implementation uses strict overlap unconditionally. The fix is to switch the comparison operators based on the clinic's `linkedScheduling` setting.

Add the corresponding endpoint `PATCH /clinics/:id/linked-scheduling` to `ClinicsController` using the existing DTO.

### Section G — Availability date range

Current `GetAvailabilityQueryDto`:

```typescript
{ date: string }
```

Replace with:

```typescript
{
  fromDate: string,  // @IsDateString
  toDate: string,    // @IsDateString — max 30 days from fromDate
}
```

Update `AvailabilityService.getAvailableSlots(professionalId, dateString)` to accept a range and return slots for every day in `[fromDate, toDate]`. Internally iterate over each date and call the existing per-day logic.

Update the controller and every caller (`AppointmentsService.validateAvailability`, `ScheduleService.getProviderSchedule`) to pass the range correctly. For the appointment validation, use `fromDate = toDate = the requested day` to preserve existing behavior.

### Section H — ClinicProfessionalsService limit enforcement

Currently `assignProfessionalToClinic` does not check the subscription limit before creating. Add the integration the original Sprint 04 spec required:

```typescript
const currentCount = await this.clinicProfessionalModel.countDocuments({
  clinicId: new Types.ObjectId(clinicId),
});
await this.subscriptionsService.enforceClinicProfessionalLimit(clinicId, currentCount);
```

Inject `SubscriptionsService`. Add `SubscriptionsModule` to `ClinicProfessionalsModule` imports.

Adjust `enforceClinicProfessionalLimit` to handle the case where no subscription exists (default to FREE limits = 2) instead of throwing, so that newly created clinics in trial state still work without manual subscription creation.

### Section I — Shared types update

Update `packages/types/src/auth.ts`, `packages/types/src/subscriptions.ts` (if exists; create otherwise) and `packages/types/src/index.ts` to mirror every schema change above. Specifically:

- `IUser`: add `displayName?: string`, `isActive: boolean`
- `IClinic`: add `cnpj`, `specialties[]`, structured `address: IAddress`, `description?`, `weeklySlots`, `autoConfirm`, `minCancelNoticeHours`, `linkedScheduling`
- `IProfessional`: add `cpf`, `registration`, structured `address: IAddress`, `phone?`, `description?`, `autoConfirm`, `minCancelNoticeHours`; change `specialty` to `Specialty` enum string
- `ISubscriptionPlan`: rename to `'free' | 'basic' | 'pro'`

If `packages/types/src/availability.ts` exists, ensure `IGetAvailabilityQuery` has `fromDate` and `toDate`.

## Files to Create

| File | Action | Reason |
|---|---|---|
| (none — all changes are updates) | — | This is a corrective sprint |

## Files to Update

| File | Section | Change |
|---|---|---|
| `apps/api/src/common/enums/specialty.enum.ts` | A | Add PSYCHIATRY and DENTISTRY |
| `apps/api/src/chat/constants/triage-prompt.ts` | A | Update prompt to mention all 5 specialties |
| `apps/api/src/subscriptions/schemas/subscription.schema.ts` | B | Rename plans to FREE/BASIC/PRO with limits 2/10/-1 |
| `apps/api/src/subscriptions/subscriptions.service.ts` | B, H | Update enforceClinicProfessionalLimit with new keys, default to FREE when no subscription |
| `apps/api/src/subscriptions/dto/create-subscription.dto.ts` | B | Use new SubscriptionPlan enum values |
| `apps/api/src/subscriptions/dto/update-subscription.dto.ts` | B | Same |
| `apps/api/src/clinics/schemas/clinic.schema.ts` | C, F | Replace string address with structured one, add cnpj, specialties, description, weeklySlots, autoConfirm, minCancelNoticeHours, linkedScheduling, indexes |
| `apps/api/src/clinics/dto/create-clinic.dto.ts` | C | Add validators for all new fields |
| `apps/api/src/clinics/dto/update-clinic.dto.ts` | C | Add optional validators for all new fields |
| `apps/api/src/clinics/clinics.controller.ts` | F | Add PATCH /:id/linked-scheduling endpoint |
| `apps/api/src/professionals/schemas/professional.schema.ts` | D | Replace string address, add cpf, registration, name (required), description, autoConfirm, minCancelNoticeHours, change specialty to enum, indexes |
| `apps/api/src/professionals/dto/create-professional.dto.ts` | D | Add validators for all new fields |
| `apps/api/src/professionals/dto/update-professional.dto.ts` | D | Add optional validators for all new fields |
| `apps/api/src/professionals/clinic-professionals.service.ts` | H | Inject SubscriptionsService, enforce limit on assign |
| `apps/api/src/professionals/clinic-professionals.module.ts` | H | Import SubscriptionsModule |
| `apps/api/src/auth/schemas/user.schema.ts` | E | Add displayName?: string and isActive: boolean (default true) |
| `apps/api/src/appointments/appointments.service.ts` | F, G | Update checkConflict to honor linkedScheduling; update validateAvailability to use date range |
| `apps/api/src/availability/dto/get-availability-query.dto.ts` | G | Replace single `date` with `fromDate` + `toDate` |
| `apps/api/src/availability/availability.service.ts` | G | Update getAvailableSlots to accept range and iterate per day |
| `apps/api/src/availability/availability.controller.ts` | G | Update endpoint to use new DTO |
| `apps/api/src/availability/services/schedule.service.ts` | G | Update call to getAvailableSlots with range |
| `packages/types/src/auth.ts` | I | Update IUser, IClinic, IProfessional |
| `packages/types/src/subscriptions.ts` | I | Update plan enum |
| `packages/types/src/availability.ts` | I | Update IGetAvailabilityQuery |
| `packages/types/src/index.ts` | I | Re-export everything |

## Test Updates

Existing tests will likely fail after these changes. The corrective sprint must update:

- `apps/api/src/subscriptions/tests/subscriptions.service.spec.ts` — use new plan names
- `apps/api/src/clinics/tests/*.spec.ts` — provide new required fields in fixtures (cnpj, structured address, specialties)
- `apps/api/src/clinics/tests/attendants.service.spec.ts` — verify displayName/isActive are persisted
- `apps/api/src/professionals/tests/*.spec.ts` (if exist) — provide new required fields
- `apps/api/src/appointments/tests/appointments.service.spec.ts` — mock clinicsService, add linkedScheduling tests
- `apps/api/src/availability/tests/availability.service.spec.ts` — use range API
- `apps/api/src/availability/tests/schedule.service.spec.ts` — use range API
- `apps/api/src/profile/tests/profile.service.spec.ts` — handle new patient profile fields

## Migration Note

This sprint is a **breaking change** at the schema level. Document in the README:

> After Sprint 12, existing Clinic, Professional, Subscription and User documents in development databases must be reset because:
> - Clinic.address changes from string to subdocument
> - Clinic gains required fields (cnpj, specialties)
> - Professional.address changes from string to subdocument
> - Professional gains required fields (cpf, registration, name)
> - SubscriptionPlan enum values are renamed
>
> Recommended: drop the dev database and recreate via signup flow.

## Definition of Done

- [ ] All 5 specialties (MEDICINE, PSYCHOLOGY, PSYCHIATRY, DENTISTRY, NUTRITION) exist in the enum
- [ ] Triage prompt mentions all 5 specialties
- [ ] Subscription plans are FREE/BASIC/PRO with limits 2/10/-1
- [ ] Clinic schema has all documented fields with correct types
- [ ] Professional schema has all documented fields with correct types
- [ ] Professional.specialty is typed as `Specialty` enum
- [ ] User.displayName and User.isActive exist as schema fields
- [ ] linkedScheduling field exists on Clinic and is enforced in checkConflict
- [ ] PATCH /clinics/:id/linked-scheduling endpoint works
- [ ] GetAvailabilityQueryDto accepts fromDate + toDate range
- [ ] getAvailableSlots returns slots for the entire range
- [ ] enforceClinicProfessionalLimit is called on assignProfessionalToClinic
- [ ] Shared types in packages/types match the new schemas
- [ ] All updated tests pass
- [ ] `tsc --noEmit` passes in apps/api and in packages/types
- [ ] No reference to old SubscriptionPlan values (PROFESSIONAL, ENTERPRISE) remains anywhere
