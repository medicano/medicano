# Sprint 10 — Profile Management & Attendant CRUD

## Objective

Allow each role to manage its own profile and let clinics fully manage their attendants (create, list, edit, remove). Add the `linkedScheduling` configuration that allows consecutive appointments at the same clinic without minimum interval (RN03, RN25).

## Dependencies

- Sprint 02 (RBAC)
- Sprint 06 (Schema enrichment) — for the address fields
- Sprint 08 (Availability) — for the scheduling configuration fields

## Scope

- Profile self-edit endpoints for `PATIENT`, `CLINIC` and `PROFESSIONAL`
- `Patient` schema (currently only User exists with role=patient — patients have no separate profile data)
- Full CRUD of attendants by their clinic
- `linkedScheduling` flag on `Clinic` and the matching rule logic in `AppointmentsService.checkConflict`

## Schemas

### `Patient` — NEW

Currently a patient only exists as a User with `role=patient`. To store profile data (name, date of birth, phone), introduce a separate `Patient` document linked to the user.

| Field | Type | Rules |
|---|---|---|
| `userId` | `ObjectId` → User | required, **unique** |
| `name` | `string` | required |
| `dateOfBirth` | `Date` | required |
| `phone` | `string` | optional |
| `address` | `Address` (subdocument) | optional — patient may not need a fixed address |
| `timestamps` | — | `true` |

### `Clinic` — fields to ADD

| Field | Type | Rules |
|---|---|---|
| `linkedScheduling` | `boolean` | default `false` (RN25 — disabled by default) |

## DTOs

### `UpdatePatientProfileDto`

```typescript
name?: string             // @IsString @IsOptional
dateOfBirth?: string      // @IsDateString @IsOptional
phone?: string            // @IsString @IsOptional
address?: AddressDto      // @ValidateNested @Type @IsOptional
```

### `UpdateClinicProfileDto`

Extends `UpdateClinicDto` (already exists). Adds nothing — this DTO is just for the new endpoint that scopes to "the current user's clinic" without requiring `:id`.

### `UpdateProfessionalProfileDto`

Same pattern as clinic — extends existing `UpdateProfessionalDto`.

### `CreateAttendantDto`

```typescript
username: string          // @IsString @MinLength(3) @MaxLength(30) @Matches(/^[a-zA-Z0-9_-]+$/)
password: string          // @IsString @MinLength(8)
displayName: string       // @IsString @MinLength(2) @MaxLength(80)
```

### `UpdateAttendantDto`

```typescript
displayName?: string      // @IsString @IsOptional
password?: string         // @IsString @MinLength(8) @IsOptional
isActive?: boolean        // @IsBoolean @IsOptional
```

### `UpdateLinkedSchedulingDto`

```typescript
linkedScheduling: boolean  // @IsBoolean
```

## User schema — fields to ADD (for attendants)

The existing User schema already supports `username` for attendants. Add:

| Field | Type | Rules |
|---|---|---|
| `displayName` | `string` | optional — display name shown in clinic dashboards |
| `isActive` | `boolean` | default `true` — soft-disable an attendant without deleting |

## Profile Service

Each role has its own profile management. Centralize in a new `profile/` module to avoid duplicating across user/clinic/professional modules.

### `profile/profile.service.ts`

```typescript
constructor(
  patientModel: Model<PatientDocument>,
  clinicsService: ClinicsService,
  professionalsService: ProfessionalsService,
  usersService: UsersService,
)

getMyProfile(userId: string): Promise<ProfileResponse>
  // Loads the User
  // Based on user.role, fetches the matching profile document:
  //   PATIENT → Patient by userId
  //   CLINIC → Clinic by userId
  //   PROFESSIONAL → Professional by userId
  //   ATTENDANT → returns User with displayName + clinic info

updatePatientProfile(userId: string, dto: UpdatePatientProfileDto): Promise<PatientDocument>
  // findOneAndUpdate by userId; upsert if not found

updateClinicProfile(userId: string, dto: UpdateClinicProfileDto): Promise<ClinicDocument>
  // Find the clinic owned by this user (Clinic.userId === userId)
  // Apply update via clinicsService.update

updateProfessionalProfile(userId: string, dto: UpdateProfessionalProfileDto): Promise<ProfessionalDocument>
  // Same pattern, via professionalsService.update
```

### `ProfileResponse`

```typescript
export interface ProfileResponse {
  user: { _id: string; role: UserRole; email?: string; username?: string };
  profile: PatientDocument | ClinicDocument | ProfessionalDocument | null;
}
```

## Profile Controller

```typescript
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController

@Get('me')
getMyProfile(@CurrentUser() userId: string)

@Put('me/patient')
@Roles(Role.PATIENT)
updatePatientProfile(@CurrentUser() userId: string, @Body() dto: UpdatePatientProfileDto)

@Put('me/clinic')
@Roles(Role.CLINIC)
updateClinicProfile(@CurrentUser() userId: string, @Body() dto: UpdateClinicProfileDto)

@Put('me/professional')
@Roles(Role.PROFESSIONAL)
updateProfessionalProfile(@CurrentUser() userId: string, @Body() dto: UpdateProfessionalProfileDto)
```

The `@Put('me/clinic')` and `@Put('me/professional')` endpoints don't take an `:id` — the user identifies their own clinic/professional via the JWT.

## Attendant CRUD Service

Lives inside `clinics/` module since attendants are scoped to a clinic.

### `clinics/services/attendants.service.ts`

```typescript
constructor(
  userModel: Model<UserDocument>,
  authService: AuthService,
)

createAttendant(clinicId: string, dto: CreateAttendantDto): Promise<UserDocument>
  // Validates clinicId
  // Hashes password with bcrypt cost 12
  // Creates User with role=ATTENDANT, clinicId, username, passwordHash, displayName
  // Catches duplicate (clinicId, username) → ConflictException

listAttendants(clinicId: string): Promise<UserDocument[]>
  // Returns all attendants of that clinic (passwordHash excluded)
  // Sorted by displayName asc

updateAttendant(
  clinicId: string,
  attendantId: string,
  dto: UpdateAttendantDto,
): Promise<UserDocument>
  // Verifies attendant belongs to the clinic
  // If password provided, hashes it before saving
  // findByIdAndUpdate with new: true; returns sanitized user

removeAttendant(clinicId: string, attendantId: string): Promise<{ success: boolean }>
  // Verifies attendant belongs to the clinic
  // Hard delete: userModel.findByIdAndDelete
  // Note: no soft-delete to avoid orphan tokens — Sprint 11 may add session revocation
```

### `clinics/controllers/attendants.controller.ts`

```typescript
@Controller('clinics/:clinicId/attendants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLINIC)  // only the clinic owner manages attendants
export class AttendantsController

POST   /                       → createAttendant()
GET    /                       → listAttendants()
PUT    /:attendantId           → updateAttendant()
DELETE /:attendantId           @HttpCode(204) → removeAttendant()
```

**Important:** the `:clinicId` in the URL must match the clinic owned by the authenticated user. Add a guard or service-level check that validates `clinicOwnerId === currentUser.id`.

## linkedScheduling — Update conflict logic

In `AppointmentsService.checkConflict`, currently any overlap blocks the appointment. The new rule:

```typescript
private async checkConflict(
  professionalId: string,
  startAt: Date,
  endAt: Date,
  clinicId: string,
  excludeId?: string,
): Promise<void> {
  // Same logic as before but:
  // If the conflicting appointment is at the SAME clinic AND linkedScheduling=true,
  //   and the conflict is exactly adjacent (no overlap, just touching boundaries),
  //   allow it.
  //
  // Practical implementation:
  // Step 1: query for STRICTLY overlapping appointments (current logic)
  //   { professionalId, startAt: { $lt: endAt }, endAt: { $gt: startAt } }
  // Step 2: if found and the existing appt is at the SAME clinic:
  //   - load clinic.linkedScheduling
  //   - if linkedScheduling=true AND appointments are strictly adjacent (existing.endAt === startAt OR existing.startAt === endAt), allow
  //   - otherwise throw ConflictException
}
```

The current overlap check (`startAt < existingEndAt && endAt > existingStartAt`) already excludes adjacency (touching is not overlap). So `linkedScheduling` actually only matters when **the database returns NO conflict for adjacent slots** — which is already the desired behavior.

**The real change is the OPPOSITE direction:** when `linkedScheduling=false`, we want to BLOCK adjacent appointments (force a minimum gap). This requires inverting the logic.

Re-thinking:

```typescript
// When linkedScheduling=false (default), enforce minimum 1-minute gap between same-professional appointments
// at the same clinic.
//
// Step 1: load the clinic to get linkedScheduling flag
// Step 2: build the query window:
//   - if linkedScheduling=true: window is [startAt, endAt) — strict overlap only
//   - if linkedScheduling=false: window is [startAt - 1ms, endAt + 1ms] — also blocks adjacent
// Step 3: query and throw if found
```

Documenting in the code comments. The simplest implementation: pass `linkedScheduling` as a parameter to `checkConflict`.

## Tests

### `profile.service.spec.ts`

| Test | Description |
|---|---|
| getMyProfile — patient | Returns user + Patient document |
| getMyProfile — clinic | Returns user + Clinic document |
| getMyProfile — professional | Returns user + Professional document |
| getMyProfile — attendant | Returns user only |
| updatePatientProfile — upsert when not exists | Creates patient on first call |
| updatePatientProfile — update existing | Modifies fields |

### `attendants.service.spec.ts`

| Test | Description |
|---|---|
| createAttendant — success | Creates user with hashed password |
| createAttendant — duplicate username in same clinic | Throws ConflictException |
| createAttendant — same username in different clinic | Succeeds |
| listAttendants | Returns attendants of that clinic only, no passwordHash |
| updateAttendant — wrong clinic | Throws NotFoundException |
| updateAttendant — password rehashed | bcrypt called when password provided |
| removeAttendant — success | Deletes user and returns `{ success: true }` |
| removeAttendant — wrong clinic | Throws NotFoundException |

### `appointments.service.spec.ts` — extend

| Test | Description |
|---|---|
| linkedScheduling=true — adjacent same-clinic appointments succeed | endAt === next.startAt → no conflict |
| linkedScheduling=false — adjacent same-clinic appointments throw | endAt === next.startAt → ConflictException |
| linkedScheduling — different clinics always require interval | Sprint 09 RN04 still applies |

## Files to Create

| File | Action |
|---|---|
| `patients/schemas/patient.schema.ts` | Create |
| `patients/dto/update-patient-profile.dto.ts` | Create |
| `patients/patients.module.ts` | Create — exports model for ProfileModule |
| `profile/dto/update-clinic-profile.dto.ts` | Create — extends UpdateClinicDto |
| `profile/dto/update-professional-profile.dto.ts` | Create — extends UpdateProfessionalDto |
| `profile/profile.service.ts` | Create |
| `profile/profile.controller.ts` | Create |
| `profile/profile.module.ts` | Create |
| `profile/tests/profile.service.spec.ts` | Create |
| `clinics/dto/create-attendant.dto.ts` | Create |
| `clinics/dto/update-attendant.dto.ts` | Create |
| `clinics/dto/update-linked-scheduling.dto.ts` | Create |
| `clinics/services/attendants.service.ts` | Create |
| `clinics/controllers/attendants.controller.ts` | Create |
| `clinics/tests/attendants.service.spec.ts` | Create |

## Files to Update

| File | Change |
|---|---|
| `auth/schemas/user.schema.ts` | Add `displayName?` and `isActive` (default true) |
| `clinics/schemas/clinic.schema.ts` | Add `linkedScheduling` field (default false) |
| `clinics/clinics.controller.ts` | Add `PATCH /:id/linked-scheduling` endpoint |
| `clinics/clinics.module.ts` | Register `AttendantsService` and `AttendantsController` |
| `appointments/appointments.service.ts` | Update `checkConflict` to consider `linkedScheduling` |
| `appointments/tests/appointments.service.spec.ts` | Add 3 new conflict tests |
| `app.module.ts` | Import `ProfileModule`, `PatientsModule` |
| `packages/types/src/auth.ts` | Update `IUser` (add displayName, isActive). Update `IClinic` (add linkedScheduling). Add `IPatient` interface |

## Definition of Done

- [ ] Profile self-edit works for all 3 main roles (patient, clinic, professional)
- [ ] Attendant CRUD scoped to clinic — owner cannot manage attendants of another clinic
- [ ] `linkedScheduling=true` allows adjacent appointments at same clinic
- [ ] `linkedScheduling=false` blocks adjacent appointments at same clinic
- [ ] All 14 new tests pass
- [ ] Existing appointment tests still pass (some need updates for new clinic param)
- [ ] `tsc --noEmit` passes

## Out of Scope

- Avatar/photo upload (would require S3 integration — future sprint)
- Soft-delete with token revocation (deferred)
- Audit log of profile changes (future)
