# Sprint 08 — Availability Slots

## Objective

Add a slot-based availability system for clinics and professionals (RF18). This is the foundation for patient-initiated scheduling and for showing available times on public profiles. Also adds clinic-level configuration for auto-confirm and minimum cancellation notice (RF19, RF23).

## Dependencies

- Sprint 03 (Appointments)
- Sprint 06 (Schema enrichment — clinic and professional must already exist with addresses)

## Scope

- Add weekly recurring slot configuration to `Clinic` and `Professional`
- Add scheduling configuration fields (`autoConfirm`, `minCancelNoticeHours`)
- Add `GET /availability/:professionalId` endpoint to compute available time slots in a date range
- Allow clinic and autonomous professional to manage their own slots

## Schema Updates

### `WeeklySlot` subdocument (shared by Clinic and Professional)

| Field | Type | Rules |
|---|---|---|
| `dayOfWeek` | `number` | required, 0–6 (0=Sunday, 6=Saturday) |
| `startTime` | `string` | required, format "HH:mm" (e.g. "09:00") |
| `endTime` | `string` | required, format "HH:mm" |
| `slotDurationMinutes` | `number` | required, min 15, max 240 |

### `Clinic` — fields to ADD

| Field | Type | Rules |
|---|---|---|
| `weeklySlots` | `WeeklySlot[]` | default `[]` |
| `autoConfirm` | `boolean` | default `false` |
| `minCancelNoticeHours` | `number` | default `24`, min 0, max 168 |

### `Professional` — fields to ADD

Same three fields as Clinic. Each professional can override the clinic's slots if they belong to one — but for autonomous professionals, these are their own slots.

## Module Structure

```
availability/
├── dto/
│   ├── update-weekly-slots.dto.ts
│   ├── update-scheduling-config.dto.ts
│   └── get-availability-query.dto.ts
├── tests/
│   ├── availability.service.spec.ts
│   └── slot-computation.spec.ts
├── availability.controller.ts
├── availability.module.ts
└── availability.service.ts

common/
└── schemas/
    └── weekly-slot.schema.ts
```

## DTOs

### `WeeklySlotDto`

```typescript
dayOfWeek: number          // @IsInt @Min(0) @Max(6)
startTime: string          // @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/)
endTime: string            // @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/)
slotDurationMinutes: number  // @IsInt @Min(15) @Max(240)
```

### `UpdateWeeklySlotsDto`

```typescript
weeklySlots: WeeklySlotDto[]  // @ValidateNested({ each: true }) @Type(() => WeeklySlotDto) @ArrayMaxSize(50)
```

### `UpdateSchedulingConfigDto`

```typescript
autoConfirm?: boolean              // @IsBoolean @IsOptional
minCancelNoticeHours?: number      // @IsInt @Min(0) @Max(168) @IsOptional
```

### `GetAvailabilityQueryDto`

```typescript
fromDate: string   // @IsDateString — start of range (inclusive, date only)
toDate: string     // @IsDateString — end of range (inclusive, date only). Max 30 days from fromDate.
```

## Service

### `AvailabilityService`

```typescript
constructor(
  professionalModel: Model<ProfessionalDocument>,
  clinicModel: Model<ClinicDocument>,
  appointmentModel: Model<AppointmentDocument>,
)

// Configuration management
updateProfessionalSlots(professionalId: string, dto: UpdateWeeklySlotsDto): Promise<ProfessionalDocument>
updateClinicSlots(clinicId: string, dto: UpdateWeeklySlotsDto): Promise<ClinicDocument>
updateProfessionalConfig(professionalId: string, dto: UpdateSchedulingConfigDto): Promise<ProfessionalDocument>
updateClinicConfig(clinicId: string, dto: UpdateSchedulingConfigDto): Promise<ClinicDocument>

// Availability computation
getAvailableSlots(professionalId: string, query: GetAvailabilityQueryDto): Promise<AvailableSlot[]>
  // 1. Validate fromDate <= toDate, range <= 30 days
  // 2. Fetch professional with weeklySlots
  // 3. Fetch existing appointments (status != CANCELLED) for [fromDate, toDate]
  // 4. For each date in range:
  //    a. Get day of week
  //    b. Get the weekly slots for that day
  //    c. Generate concrete time slots based on startTime, endTime, slotDurationMinutes
  //    d. Filter out slots that overlap with existing appointments
  // 5. Return flat array of { date: Date, startAt: Date, endAt: Date }
```

### `AvailableSlot` interface

```typescript
export interface AvailableSlot {
  date: string;     // YYYY-MM-DD
  startAt: Date;    // full datetime
  endAt: Date;      // full datetime
  durationMinutes: number;
}
```

## Slot Computation Algorithm (pure function, easy to test)

Extract this as a pure utility in `availability/utils/compute-slots.ts`:

```typescript
export function computeSlotsForDay(
  date: Date,
  weeklySlots: WeeklySlot[],
  appointments: { startAt: Date; endAt: Date }[],
): AvailableSlot[] {
  const dayOfWeek = date.getDay();
  const slotsForDay = weeklySlots.filter(s => s.dayOfWeek === dayOfWeek);

  const result: AvailableSlot[] = [];

  for (const config of slotsForDay) {
    const [startH, startM] = config.startTime.split(':').map(Number);
    const [endH, endM] = config.endTime.split(':').map(Number);

    let cursor = new Date(date);
    cursor.setHours(startH, startM, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(endH, endM, 0, 0);

    while (cursor.getTime() + config.slotDurationMinutes * 60_000 <= dayEnd.getTime()) {
      const slotEnd = new Date(cursor.getTime() + config.slotDurationMinutes * 60_000);

      const overlaps = appointments.some(a =>
        a.startAt < slotEnd && a.endAt > cursor
      );

      if (!overlaps) {
        result.push({
          date: cursor.toISOString().slice(0, 10),
          startAt: new Date(cursor),
          endAt: slotEnd,
          durationMinutes: config.slotDurationMinutes,
        });
      }

      cursor = slotEnd;
    }
  }

  return result;
}
```

## Controller

```typescript
@Controller('availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController

// PUBLIC endpoint to view availability
@Get('professionals/:professionalId')
// NO @Roles — public (a patient or visitor can see availability)
// BUT: requires JwtAuthGuard? Actually NO — make this public for the search flow
getAvailability(
  @Param('professionalId', ParseMongoIdPipe) professionalId: string,
  @Query() query: GetAvailabilityQueryDto,
): Promise<AvailableSlot[]>

// CONFIGURATION endpoints
@Put('professionals/:professionalId/weekly-slots')
@Roles(Role.PROFESSIONAL, Role.CLINIC)
updateProfessionalSlots()

@Put('clinics/:clinicId/weekly-slots')
@Roles(Role.CLINIC)
updateClinicSlots()

@Put('professionals/:professionalId/config')
@Roles(Role.PROFESSIONAL, Role.CLINIC)
updateProfessionalConfig()

@Put('clinics/:clinicId/config')
@Roles(Role.CLINIC)
updateClinicConfig()
```

**Note on the public availability endpoint:** the endpoint should NOT require authentication. Either:
- Move it to a public controller, OR
- Apply `@SkipAuth()` decorator if one exists

For consistency with the search module (which is public), prefer the first option: keep the read endpoint outside `availability.controller.ts` or split into two controllers.

## Tests

### `slot-computation.spec.ts` (pure function)

| Test | Description |
|---|---|
| computes slots for a Monday with 09:00–12:00, 30min duration | Returns 6 slots: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30 |
| skips slot that exactly matches an appointment | Slot 10:00 with appointment 10:00–10:30 → not included |
| keeps adjacent non-overlapping slots | Slot 10:30 with appointment 10:00–10:30 → included |
| returns empty when no weekly config matches day | Sunday with only Mon-Fri config → [] |
| handles two separate slot windows on same day | 08:00-12:00 + 14:00-18:00 → continuous slots in two blocks |
| ignores cancelled appointments | Appointment with status CANCELLED → does not block slot |

### `availability.service.spec.ts`

| Test | Description |
|---|---|
| getAvailableSlots — fromDate > toDate | Throws BadRequestException |
| getAvailableSlots — range > 30 days | Throws BadRequestException |
| getAvailableSlots — professional not found | Throws NotFoundException |
| updateProfessionalSlots — saves correctly | Slots persisted on professional doc |

## Files to Create

| File | Action |
|---|---|
| `common/schemas/weekly-slot.schema.ts` | Create |
| `common/dto/weekly-slot.dto.ts` | Create |
| `availability/dto/update-weekly-slots.dto.ts` | Create |
| `availability/dto/update-scheduling-config.dto.ts` | Create |
| `availability/dto/get-availability-query.dto.ts` | Create |
| `availability/utils/compute-slots.ts` | Create — pure function |
| `availability/availability.service.ts` | Create |
| `availability/availability.controller.ts` | Create |
| `availability/availability.module.ts` | Create |
| `availability/tests/slot-computation.spec.ts` | Create |
| `availability/tests/availability.service.spec.ts` | Create |
| `packages/types/src/availability.ts` | Create — `IWeeklySlot`, `IAvailableSlot`, `ISchedulingConfig` |

## Files to Update

| File | Change |
|---|---|
| `clinics/schemas/clinic.schema.ts` | Add `weeklySlots`, `autoConfirm`, `minCancelNoticeHours` |
| `professionals/schemas/professional.schema.ts` | Same three fields |
| `app.module.ts` | Import `AvailabilityModule` |
| `packages/types/src/auth.ts` | Add scheduling fields to `IClinic` and `IProfessional` |
| `packages/types/src/index.ts` | Re-export from `./availability` |

## Definition of Done

- [ ] All slot-computation unit tests pass (6 cases)
- [ ] All availability.service tests pass (8 cases)
- [ ] Existing clinic, professional and appointment tests still pass
- [ ] `GET /availability/professionals/:id?fromDate=X&toDate=Y` returns valid slots
- [ ] Slot computation correctly excludes overlapping non-cancelled appointments
- [ ] `tsc --noEmit` passes

## Out of Scope

- Time-zone handling (all dates assumed in `America/Sao_Paulo`)
- Multi-clinic professional with different configs per clinic
- Slot reservation locks (concurrency on appointment creation)
