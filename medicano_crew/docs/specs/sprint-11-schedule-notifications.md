# Sprint 11 — Provider Schedule View & Email Notifications

## Objective

Close the last documented MVP gaps:

- Add a dedicated daily/weekly schedule view endpoint (RF20) — combining appointments + free slots in one response, optimized for the provider dashboard
- Add email notifications via AWS SES for the key appointment lifecycle events (creation, confirmation, cancellation)
- Add `Subscription` support for autonomous professionals to fully enforce RN20 (autônomo without active plan must not appear in search)

## Dependencies

- Sprint 03 (Appointments)
- Sprint 04 (Subscriptions — currently clinic-only)
- Sprint 06 (Search)
- Sprint 08 (Availability)
- Sprint 09 (Patient scheduling)
- External: `@aws-sdk/client-ses` package
- Environment variables: `AWS_SES_REGION`, `AWS_SES_FROM_EMAIL`, `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`

## Scope

- New `GET /schedule/professionals/:id` endpoint returning combined view
- Generalize `Subscription` to support both clinic and professional ownership
- Update search to filter out professionals without active subscription (closes RN20)
- New `notifications/` module with AWS SES integration
- Hook notifications into appointment events (create, confirm, cancel)

## Schedule View Endpoint (RF20)

### Service — `availability/services/schedule.service.ts`

Combines existing data sources rather than a new collection.

```typescript
constructor(
  availabilityService: AvailabilityService,
  appointmentsService: AppointmentsService,
)

async getProviderSchedule(
  professionalId: string,
  query: GetScheduleQueryDto,
): Promise<ScheduleResponse> {
  const slots = await this.availabilityService.getAvailableSlots(professionalId, {
    fromDate: query.fromDate,
    toDate: query.toDate,
  });

  const appointments = await this.appointmentsService.findAll({
    professionalId,
    dateFrom: query.fromDate,
    dateTo: query.toDate,
  });

  return {
    fromDate: query.fromDate,
    toDate: query.toDate,
    availableSlots: slots,
    appointments,
  };
}
```

The endpoint is **authenticated and role-restricted** to the professional themselves, the clinic that owns them, or attendants of that clinic.

### DTO — `GetScheduleQueryDto`

```typescript
fromDate: string  // @IsDateString — date only
toDate: string    // @IsDateString — date only, max 30 days from fromDate
```

### Controller endpoint

```typescript
@Get('schedule/professionals/:professionalId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PROFESSIONAL, Role.CLINIC, Role.ATTENDANT)
getProviderSchedule(
  @Param('professionalId', ParseMongoIdPipe) id: string,
  @Query() query: GetScheduleQueryDto,
  @CurrentUser() userId: string,
)
```

The service must verify that:
- If user is `PROFESSIONAL`: `professional.userId === userId`
- If user is `CLINIC` or `ATTENDANT`: the professional is linked to their clinic (via `ClinicProfessional`)
- Otherwise throw `ForbiddenException`

## Subscription generalization

### `Subscription` schema — UPDATE

Currently has `clinicId` only. Generalize to support either clinic or professional ownership.

| Field | Type | Rules |
|---|---|---|
| `ownerType` | `'clinic' \| 'professional'` | required |
| `ownerId` | `ObjectId` | required (refers to Clinic or Professional based on ownerType) |
| `plan` | `SubscriptionPlan` | unchanged |
| `status` | `SubscriptionStatus` | unchanged |
| `expiresAt` | `Date` | unchanged |

Drop the unique index on `clinicId` and replace with:

```typescript
SubscriptionSchema.index({ ownerType: 1, ownerId: 1 }, { unique: true });
```

**Migration concern:** existing subscriptions have `clinicId`. The migration step inside this sprint should:

1. Add new fields with default values (`ownerType: 'clinic'`, copy `clinicId` to `ownerId`)
2. Document that existing data needs manual migration via a one-off script

Since this is academic and the dev DB can be reset, a migration script is out of scope — just document the breaking change clearly.

### Service updates

- Add `findByOwner(ownerType, ownerId)` (replaces `findByClinicId`)
- Keep a deprecated alias `findByClinicId` for backward compatibility
- `enforceClinicProfessionalLimit` continues to work — internally calls `findByOwner('clinic', clinicId)`

### Search update — close RN20

In `SearchService.search`, remove the existing TODO and add the filter:

```typescript
// Filter professionals to only those with active subscription (RN20)
const professionalIds = await this.subscriptionsService.findActiveOwnerIds('professional');
const professionalFilter = { ...baseProfessionalFilter, _id: { $in: professionalIds } };
```

Add new method:

```typescript
findActiveOwnerIds(ownerType: 'clinic' | 'professional'): Promise<ObjectId[]>
  // returns IDs where status='active' AND expiresAt > now
```

## Email Notifications (AWS SES)

### Module structure

```
notifications/
├── templates/
│   ├── appointment-created.template.ts
│   ├── appointment-confirmed.template.ts
│   └── appointment-cancelled.template.ts
├── tests/
│   └── notifications.service.spec.ts
├── notifications.service.ts
└── notifications.module.ts
```

### `NotificationsService`

```typescript
constructor(
  configService: ConfigService,
  patientModel: Model<PatientDocument>,
  professionalsService: ProfessionalsService,
)
// Instantiates SESClient with region + credentials from ConfigService

private async sendEmail(to: string, subject: string, htmlBody: string, textBody: string): Promise<void>
  // Uses SESClient.send(new SendEmailCommand({...}))
  // Catches and logs errors — does NOT throw upstream (notifications are best-effort)

async notifyAppointmentCreated(appointment: AppointmentDocument): Promise<void>
  // Loads patient email and professional email
  // Renders templates
  // Sends to both parties

async notifyAppointmentConfirmed(appointment: AppointmentDocument): Promise<void>
  // Sends only to patient

async notifyAppointmentCancelled(appointment: AppointmentDocument, cancelledBy: 'patient' | 'provider'): Promise<void>
  // Sends to the OTHER party (the one who didn't cancel)
```

### Templates

Each template is a pure function that receives appointment data and returns `{ subject, html, text }`.

```typescript
// appointment-created.template.ts
export function appointmentCreatedTemplate(data: {
  patientName: string;
  professionalName: string;
  startAt: Date;
  durationMinutes: number;
}): { subject: string; html: string; text: string } {
  const formattedDate = formatDateBR(data.startAt);
  return {
    subject: 'Novo agendamento na Medicano',
    text: `Olá ${data.patientName},\n\nSeu agendamento foi registrado com ${data.professionalName} para ${formattedDate}.\n\nAtenciosamente,\nEquipe Medicano`,
    html: `<p>Olá ${data.patientName},</p><p>Seu agendamento foi registrado com <strong>${data.professionalName}</strong> para <strong>${formattedDate}</strong>.</p><p>Atenciosamente,<br>Equipe Medicano</p>`,
  };
}
```

Keep templates simple HTML — no images, no external CSS. Inline styles only if needed.

### Hook into appointment events

Update `AppointmentsService` to fire notifications **after** persisting changes. Wrap in try/catch so notification failures never break the main flow.

```typescript
async createForPatient(...) {
  const appointment = await this.appointmentModel.create({...});

  // Fire-and-forget notification
  this.notificationsService
    .notifyAppointmentCreated(appointment)
    .catch(err => this.logger.warn('Notification failed', err));

  return appointment;
}

async updateStatus(id, dto) {
  const appointment = await this.findById(id);
  // ... existing transition validation

  appointment.status = dto.status;
  await appointment.save();

  if (dto.status === AppointmentStatus.CONFIRMED) {
    this.notificationsService
      .notifyAppointmentConfirmed(appointment)
      .catch(...);
  } else if (dto.status === AppointmentStatus.CANCELLED) {
    this.notificationsService
      .notifyAppointmentCancelled(appointment, 'provider')
      .catch(...);
  }

  return appointment;
}

async cancelAsPatient(...) {
  // ... existing logic
  appointment.status = AppointmentStatus.CANCELLED;
  await appointment.save();

  this.notificationsService
    .notifyAppointmentCancelled(appointment, 'patient')
    .catch(...);

  return appointment;
}
```

### Configuration

Add to `apps/api/src/config/configuration.ts`:

```typescript
ses: {
  region: process.env.AWS_SES_REGION || 'us-east-1',
  fromEmail: process.env.AWS_SES_FROM_EMAIL || 'no-reply@medicano.app',
  accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
}
```

In production, prefer using IAM role attached to the EC2 instance over explicit credentials (mentioned in TCC Capítulo 5.6.3). Document that for the dev environment, credentials are loaded from env vars; for production, they come from the EC2 IAM role.

## Tests

### `schedule.service.spec.ts`

| Test | Description |
|---|---|
| getProviderSchedule — combined response | Returns slots and appointments together |
| getProviderSchedule — professional accessing own schedule | Allowed |
| getProviderSchedule — clinic accessing linked professional | Allowed |
| getProviderSchedule — clinic accessing UNLINKED professional | Throws ForbiddenException |
| getProviderSchedule — professional accessing another | Throws ForbiddenException |

### `subscriptions.service.spec.ts` — extend

| Test | Description |
|---|---|
| findByOwner('clinic', id) — returns clinic subscription | |
| findByOwner('professional', id) — returns professional subscription | |
| findActiveOwnerIds — filters by status and expiresAt | |
| findByClinicId — backward compat alias still works | |

### `notifications.service.spec.ts`

| Test | Description |
|---|---|
| notifyAppointmentCreated — sends email to both parties | Mock SESClient.send, verify 2 calls |
| notifyAppointmentConfirmed — sends only to patient | 1 call to patient email |
| notifyAppointmentCancelled by patient — sends to provider only | 1 call to provider |
| notifyAppointmentCancelled by provider — sends to patient only | 1 call to patient |
| sendEmail — SES error is caught and logged | Mock send to throw, verify no exception bubbles |

Mock `@aws-sdk/client-ses` SESClient — never call real SES in unit tests.

```typescript
const mockSESClient = {
  send: jest.fn().mockResolvedValue({ MessageId: 'fake-id' }),
};
```

### `search.service.spec.ts` — extend

| Test | Description |
|---|---|
| search — filters out professionals without active subscription | RN20 enforced |
| search — clinics are not filtered by subscription (yet) | Clinics still appear |

## Files to Create

| File | Action |
|---|---|
| `availability/services/schedule.service.ts` | Create |
| `availability/dto/get-schedule-query.dto.ts` | Create |
| `availability/tests/schedule.service.spec.ts` | Create |
| `notifications/notifications.service.ts` | Create |
| `notifications/notifications.module.ts` | Create |
| `notifications/templates/appointment-created.template.ts` | Create |
| `notifications/templates/appointment-confirmed.template.ts` | Create |
| `notifications/templates/appointment-cancelled.template.ts` | Create |
| `notifications/utils/format-date.ts` | Create — pt-BR date formatter |
| `notifications/tests/notifications.service.spec.ts` | Create |

## Files to Update

| File | Change |
|---|---|
| `subscriptions/schemas/subscription.schema.ts` | Add `ownerType` and `ownerId`, drop unique on clinicId, add unique on (ownerType, ownerId) |
| `subscriptions/dto/create-subscription.dto.ts` | Add `ownerType` and `ownerId` fields, keep `clinicId` as deprecated optional |
| `subscriptions/subscriptions.service.ts` | Add `findByOwner`, `findActiveOwnerIds`, keep `findByClinicId` alias |
| `subscriptions/tests/subscriptions.service.spec.ts` | Add 4 new tests |
| `search/search.service.ts` | Filter professionals by active subscription (RN20) |
| `search/search.service.spec.ts` | Add 2 RN20 tests |
| `availability/availability.controller.ts` | Add `GET schedule/professionals/:id` endpoint |
| `availability/availability.module.ts` | Provide `ScheduleService` |
| `appointments/appointments.service.ts` | Inject `NotificationsService`, fire notifications on create/confirm/cancel |
| `appointments/appointments.module.ts` | Import `NotificationsModule` |
| `app.module.ts` | Import `NotificationsModule` |
| `config/configuration.ts` | Add `ses` block |
| `apps/api/package.json` | Add `@aws-sdk/client-ses` dependency |
| `packages/types/src/availability.ts` | Add `IScheduleResponse` interface |

## Definition of Done

- [ ] `GET /availability/schedule/professionals/:id` returns combined slots + appointments
- [ ] Authorization properly restricts schedule access to owner / clinic / linked attendant
- [ ] Subscription supports both clinic and professional ownership
- [ ] Search filters out professionals without active subscription (RN20)
- [ ] Email is sent on appointment creation, confirmation, cancellation (verified via mock)
- [ ] Notification failures do NOT break the appointment flow
- [ ] All existing tests still pass
- [ ] All new tests pass (5 schedule + 4 subscription + 5 notification + 2 search = 16 total)
- [ ] `tsc --noEmit` passes

## Out of Scope

- Email opt-out / preferences UI (future)
- SMS notifications (future)
- Push notifications (future)
- Email templates with branded design (future)
- Internationalization of email content (Portuguese only for MVP)
