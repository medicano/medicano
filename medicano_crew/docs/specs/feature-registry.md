# Feature Registry — Medicano Backend

This file is the canonical inventory of every file, class, and method that already
exists in the codebase. Before creating anything, check here first.
If it is listed here, **do not recreate it** — import it from the path shown.

Last updated: 2026-04-26 (sprint-10: profile, attendants, patients — sprints 05–09 backfilled)

> **Wire-up status:** `app.module.ts` currently imports only the original 6 modules (Auth, Users,
> Clinics, Professionals, ClinicProfessionals, Redis). Modules added in sprints 05–10 exist on disk
> but have not yet been added to AppModule. Add each one to `app.module.ts` before exposing its
> endpoints.

---

## Shared Types — `packages/types`

| File | Exists | Exports |
|---|---|---|
| `packages/types/package.json` | ✅ | package name: `@medicano/types` |
| `packages/types/tsconfig.json` | ✅ | — |
| `packages/types/src/auth.ts` | ✅ | UserRole, IUser, IClinic, IProfessional, IClinicProfessional, IAuthTokens, ILoginStandardDto, ILoginAttendantDto |
| `packages/types/src/index.ts` | ✅ | re-exports from ./auth |

---

## Common — `apps/api/src/common`

### `common/enums/role.enum.ts` ✅
```typescript
export enum Role {
  PATIENT = 'patient',
  CLINIC = 'clinic',
  PROFESSIONAL = 'professional',
  ATTENDANT = 'attendant',
}
```

### `common/enums/specialty.enum.ts` ✅ (sprint 06)
```typescript
export enum Specialty {
  MEDICINE = 'medicine',
  PSYCHOLOGY = 'psychology',
  NUTRITION = 'nutrition',
}
// NOTE: spec lists 5 values; codebase currently has 3
```

### `common/decorators/current-user.decorator.ts` ✅
```typescript
export const CurrentUser = createParamDecorator(...)
// Returns: request.user?.userId (string)
```

### `common/decorators/current-user-role.decorator.ts` ✅ (sprint 08)
```typescript
export const CurrentUserRole = createParamDecorator(...)
// Returns: request.user?.role (Role | undefined)
```

### `common/filters/all-exceptions.filter.ts` ✅
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter
// catch(exception, host): returns { statusCode, message, timestamp }
```

### `common/config/aws-secrets.loader.ts` ✅
```typescript
export async function loadAwsSecrets(): Promise<Record<string, string>>
// NODE_ENV=test: returns hardcoded local config (mongodb://localhost:27017/medicano-test, Redis localhost)
// NODE_ENV=development|staging|production: fetches JSON from AWS Secrets Manager
// Secret name pattern: medicano/api/{NODE_ENV}
// Region: process.env.AWS_REGION ?? 'us-east-2'
// Throws if SecretString is empty or NODE_ENV is unrecognised
```

### `common/pipes/parse-mongo-id.pipe.ts` ✅
```typescript
@Injectable()
export class ParseMongoIdPipe implements PipeTransform<string, string>
// transform(value): validates Types.ObjectId.isValid(value), throws BadRequestException if invalid
// Used as @Param('id', ParseMongoIdPipe) to validate route params at the controller boundary
```

### `common/schemas/address.schema.ts` ✅ (sprint 06)
```typescript
@Schema({ _id: false, versionKey: false })
export class Address
  street: string        // required
  number: string        // required
  complement?: string
  neighborhood: string  // required
  city: string          // required
  state: string         // required, min/maxlength 2
  zipCode: string       // required, matches /^\d{8}$/

export const AddressSchema = SchemaFactory.createForClass(Address)
```

### `common/schemas/weekly-slot.schema.ts` ✅ (sprint 08)
```typescript
@Schema({ _id: false })
export class WeeklySlot
  dayOfWeek: number          // required, min 0, max 6 (0=Sunday)
  startTime: string          // required, format "HH:mm"
  endTime: string            // required, format "HH:mm"
  slotDurationMinutes: number  // required, min 15, max 240

export const WeeklySlotSchema = SchemaFactory.createForClass(WeeklySlot)
```

### `common/dto/address.dto.ts` ✅ (sprint 06)
```typescript
export class AddressDto
  street: string         // @IsString @IsNotEmpty
  number: string         // @IsString @IsNotEmpty
  complement?: string    // @IsString @IsOptional
  neighborhood: string   // @IsString @IsNotEmpty
  city: string           // @IsString @IsNotEmpty
  state: string          // @IsString @Length(2, 2)
  zipCode: string        // @IsString @Matches(/^\d{8}$/)
```

### `common/dto/weekly-slot.dto.ts` ✅ (sprint 08)
```typescript
export class WeeklySlotDto
  dayOfWeek: number          // @IsInt @Min(0) @Max(6)
  startTime: string          // @IsString
  endTime: string            // @IsString
  slotDurationMinutes: number  // @IsInt @Min(15) @Max(240)
```

### `common/utils/validate-weekly-slots.ts` ✅ (sprint 08)
```typescript
export function validateWeeklySlots(slots: WeeklySlotDto[]): void
// Validates slot time format and that startTime < endTime
```

---

## Redis — `apps/api/src/redis`

### `redis/redis.service.ts` ✅
```typescript
@Injectable()
export class RedisService
// Reads: REDIS_HOST (default 'localhost'), REDIS_PORT (default 6379) from ConfigService
// ioredis client created in constructor (no OnModuleInit)
// Redis key pattern: auth:token:{userId}

saveToken(userId: string, token: string, ttl: number): Promise<void>
getToken(userId: string): Promise<string | null>
validateToken(userId: string, token: string): Promise<boolean>
  // returns true if storedToken === token
removeToken(userId: string): Promise<void>
```

### `redis/redis.module.ts` ✅
```typescript
@Global()
@Module({ providers: [RedisService], exports: [RedisService] })
export class RedisModule
// Global — import once in AppModule; RedisService is available everywhere
```

---

## Auth — `apps/api/src/auth`

### `auth/schemas/user.schema.ts` ✅ (updated sprint 10: added displayName, isActive)
```typescript
// NOTE: UserRole is a string union (not Role enum) in this schema:
export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'staff' | 'patient'

@Schema({ timestamps: true })
export class User
  role: UserRole               // required, enum string union
  email: string                // required, lowercase, trim
  username: string             // required, trim
  clinicId?: Types.ObjectId    // ref: 'Clinic', optional, default null
  passwordHash: string         // required (select: not set to false in current schema)
  displayName?: string         // optional — display name for attendants
  isActive: boolean            // default: true

export type UserDocument = HydratedDocument<User>
export const UserSchema = SchemaFactory.createForClass(User)
// Compound indexes:
//   { role, email } unique
//   { clinicId, username } unique
```

### `auth/dto/signup.dto.ts` ✅
```typescript
export class SignupDto
  role: Role          // @IsEnum — required
  email?: string      // @IsEmail @IsOptional
  username?: string   // @IsString @IsOptional
  clinicId?: string   // @IsMongoId @IsOptional
  password: string    // @IsString @MinLength(8)
```

### `auth/dto/login-standard.dto.ts` ✅
```typescript
export class LoginStandardDto
  email: string    // @IsEmail
  password: string // @IsString @MinLength(8)
```

### `auth/dto/login-attendant.dto.ts` ✅
```typescript
export class LoginAttendantDto
  clinicId: string  // @IsMongoId
  username: string  // @IsString
  password: string  // @IsString @MinLength(8)
```

### `auth/jwt.strategy.ts` ✅
```typescript
// JwtPayload (inline interface): { sub: string; role: Role }
// Location: auth/jwt.strategy.ts (directly in auth/, NOT in a strategies/ subfolder)
// Test imports: import { JwtStrategy } from '../jwt.strategy'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy)
// constructor: reads JWT_SECRET from ConfigService (default 'default-secret')
// ExtractJwt.fromAuthHeaderAsBearerToken()

validate(payload: JwtPayload): Promise<{ userId: string; role: Role }>
// Calls redisService.getToken(payload.sub)
// Throws UnauthorizedException if null (token revoked)
// Returns { userId: payload.sub, role: payload.role }
```

### `auth/guards/jwt-auth.guard.ts` ✅
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt')
```

### `auth/auth.service.ts` ✅
```typescript
@Injectable()
export class AuthService
// TOKEN_TTL = 7 * 24 * 3600 (604800s)
// STANDARD_ROLES = [Role.PATIENT, Role.CLINIC, Role.PROFESSIONAL]

signup(dto: SignupDto): Promise<{ accessToken: string }>
loginStandard(dto: LoginStandardDto): Promise<{ accessToken: string }>
loginAttendant(dto: LoginAttendantDto): Promise<{ accessToken: string }>
logout(userId: string): Promise<void>
  // calls redisService.removeToken(userId)
```

### `auth/auth.controller.ts` ✅
```typescript
@Controller('auth')
export class AuthController
  POST /auth/signup            → authService.signup()          @HttpCode(201) — default
  POST /auth/login             → authService.loginStandard()   @HttpCode(200)
  POST /auth/login/attendant   → authService.loginAttendant()  @HttpCode(200)
  POST /auth/logout            → authService.logout()          @HttpCode(204) @UseGuards(JwtAuthGuard)
// logout uses @CurrentUser() to extract userId from JWT
```

### `auth/auth.module.ts` ✅
```typescript
@Module({
  imports: [PassportModule, JwtModule.registerAsync(...), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule
```

### `auth/decorators/roles.decorator.ts` ✅
```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### `auth/guards/roles.guard.ts` ✅
```typescript
@Injectable()
export class RolesGuard implements CanActivate
// constructor(reflector: Reflector)
// canActivate(context): reads ROLES_KEY metadata via Reflector.getAllAndOverride
//   returns true if no @Roles() is set
//   checks request.user.role against requiredRoles
// MUST be applied after JwtAuthGuard
```

### Auth tests — `auth/tests/` ✅
```
auth/tests/auth.service.spec.ts    — 9 tests, all pass
auth/tests/redis.service.spec.ts   — 8 tests, all pass
auth/tests/jwt.strategy.spec.ts    — 3 tests, all pass
auth/tests/auth.e2e.spec.ts        — 9 tests, require MongoDB + Redis
auth/tests/roles.guard.spec.ts     — 6 tests, all pass
```

---

## Users — `apps/api/src/users`

### `users/dto/create-user.dto.ts` ✅
```typescript
export class CreateUserDto
  role: Role          // @IsEnum — required
  email?: string      // @IsEmail @IsOptional
  username?: string   // @IsString @IsOptional
  clinicId?: string   // @IsMongoId @IsOptional
  password: string    // @IsString @MinLength(8) — hashed inside UsersService.createUser
```

### `users/dto/update-user.dto.ts` ✅
```typescript
export class UpdateUserDto   // role is immutable — never in update DTO
  email?: string      // @IsEmail @IsOptional
  username?: string   // @IsString @IsOptional
  clinicId?: string   // @IsMongoId @IsOptional
```

### `users/users.service.ts` ✅
```typescript
@Injectable()
export class UsersService

createUser(dto: CreateUserDto): Promise<UserDocument>
  // hashes dto.password with bcrypt cost 12, stores as passwordHash
  // catches MongoError 11000 → ConflictException('User already exists')

comparePassword(password: string, passwordHash: string): Promise<boolean>

getById(id: string): Promise<UserDocument>
  // validates ObjectId → NotFoundException for invalid id or not found

findByEmailAndRole(email: string, role: Role): Promise<UserDocument | null>
  // .select('+passwordHash') — returns null if not found

findByClinicIdAndUsername(clinicId: string, username: string): Promise<UserDocument | null>
  // .select('+passwordHash') — returns null if not found
```

### `users/users.controller.ts` ✅
```typescript
@Controller('users') @UseGuards(JwtAuthGuard)
export class UsersController
  GET /users/:id → usersService.getById()
```

### `users/users.module.ts` ✅
```typescript
@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule
// User schema imported from auth/schemas/user.schema.ts
```

---

## Clinics — `apps/api/src/clinics`

### `clinics/schemas/clinic.schema.ts` ✅ (simplified in recent refactor; updated sprint 10)
```typescript
@Schema({ timestamps: true })
export class Clinic
  name: string              // required
  address?: string          // plain string (not Address subdocument)
  phone?: string
  email?: string
  linkedScheduling: boolean // default: false (sprint 10 — RN25)

export type ClinicDocument = Clinic & Document
export const ClinicSchema = SchemaFactory.createForClass(Clinic)
// NOTE: subscriptionStatus, cnpj, specialties, Address subdocument, weeklySlots,
//       autoConfirm, minCancelNoticeHours are NOT in the current schema.
//       The schema was simplified in the refactor commit (b94284c/6dc6ec5).
```

### `clinics/dto/create-clinic.dto.ts` ✅
```typescript
export class CreateClinicDto
  name: string
  // NOTE: simplified DTO — does not yet include cnpj, specialties, address subdocument
```

### `clinics/dto/update-clinic.dto.ts` ✅
```typescript
export class UpdateClinicDto  // all fields optional
```

### `clinics/dto/create-attendant.dto.ts` ✅ (sprint 10)
```typescript
export class CreateAttendantDto
  username: string          // @IsString @MinLength(3) @MaxLength(30) @Matches(/^[a-zA-Z0-9_-]+$/)
  password: string          // @IsString @MinLength(8)
  displayName: string       // @IsString @MinLength(2) @MaxLength(80)
```

### `clinics/dto/update-attendant.dto.ts` ✅ (sprint 10)
```typescript
export class UpdateAttendantDto
  displayName?: string      // @IsString @IsOptional
  password?: string         // @IsString @MinLength(8) @IsOptional
  isActive?: boolean        // @IsBoolean @IsOptional
```

### `clinics/dto/update-linked-scheduling.dto.ts` ✅ (sprint 10)
```typescript
export class UpdateLinkedSchedulingDto
  linkedScheduling: boolean  // @IsBoolean
```

### `clinics/clinics.service.ts` ✅ (updated: remove returns ClinicDocument, not {success})
```typescript
@Injectable()
export class ClinicsService

create(dto: CreateClinicDto): Promise<ClinicDocument>
findAll(): Promise<ClinicDocument[]>
findById(id: string): Promise<ClinicDocument>    // validates ObjectId, throws NotFoundException
update(id: string, dto: UpdateClinicDto): Promise<ClinicDocument>
remove(id: string): Promise<ClinicDocument>      // NOTE: returns deleted doc, not {success}

// ⚠️ findByUserId(userId: string) is called by ProfileService but NOT yet implemented
```

### `clinics/clinics.controller.ts` ✅
```typescript
@Controller('clinics') @UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicsController
  POST   /clinics       @Roles(CLINIC)   → create()
  GET    /clinics                        → findAll()
  GET    /clinics/:id                    → findOne()
  PUT    /clinics/:id   @Roles(CLINIC)   → update()
  DELETE /clinics/:id   @Roles(CLINIC)   → remove()
```

### `clinics/clinics.module.ts` ✅
```typescript
@Module({
  imports: [MongooseModule.forFeature([Clinic])],
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService, MongooseModule],
})
export class ClinicsModule
// NOTE: AttendantsService and AttendantsController are NOT yet registered here
```

### `clinics/services/attendants.service.ts` ✅ (sprint 10)
```typescript
@Injectable()
export class AttendantsService
// Injects: Model<UserDocument> ('User'), ClinicsService

createAttendant(clinicId: string, currentUserId: string, dto: CreateAttendantDto): Promise<UserDocument>
  // asserts clinic ownership (clinic.userId === currentUserId)
  // hashes password, creates User with role=ATTENDANT
  // catches 11000 → ConflictException('Username already taken in this clinic')
  // returns sanitized user (no passwordHash)

listAttendants(clinicId: string, currentUserId: string): Promise<UserDocument[]>
  // asserts ownership; finds by { role: ATTENDANT, clinicId }; .select('-passwordHash')
  // sorted by displayName asc

updateAttendant(clinicId, attendantId, currentUserId, dto): Promise<UserDocument>
  // asserts ownership; validates attendantId; finds by { _id, role: ATTENDANT, clinicId }
  // rehashes password if dto.password provided
  // throws NotFoundException if attendant not found in clinic

removeAttendant(clinicId, attendantId, currentUserId): Promise<{ success: true }>
  // asserts ownership; deleteOne({ _id, role: ATTENDANT, clinicId })
  // throws NotFoundException if not found

private assertClinicOwnership(clinicId, currentUserId): Promise<void>
  // loads clinic via clinicsService.findById; throws ForbiddenException if clinic.userId !== currentUserId
```

### `clinics/controllers/attendants.controller.ts` ✅ (sprint 10)
```typescript
@Controller('clinics/:clinicId/attendants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLINIC)
export class AttendantsController
  POST   /                   → createAttendant()
  GET    /                   → listAttendants()
  PUT    /:attendantId        → updateAttendant()
  DELETE /:attendantId        @HttpCode(204) → removeAttendant()
// ⚠️ Not yet registered in ClinicsModule
```

### Clinics tests
```
clinics/tests/attendants.service.spec.ts  ✅ (sprint 10) — 8 tests
```

---

## Professionals — `apps/api/src/professionals`

### `professionals/schemas/professional.schema.ts` ✅ (enriched sprints 06+08)
```typescript
@Schema({ timestamps: true })
export class Professional
  userId: Types.ObjectId     // ref: 'User', required, unique
  specialty: Specialty       // required (enum, not free string)
  cpf: string                // required, unique
  registration: string       // required (e.g. "CRM/SP 123456")
  address: Address           // required (Address subdocument from common/schemas/address.schema)
  phone?: string             // optional
  description?: string       // optional, maxlength 1000
  weeklySlots: WeeklySlot[]  // default []

export type ProfessionalDocument = Professional & Document
export const ProfessionalSchema = SchemaFactory.createForClass(Professional)
// Indexes:
//   { 'address.city', specialty }
//   { cpf } unique
```

### `professionals/dto/create-professional.dto.ts` ✅ (updated sprint 06)
```typescript
export class CreateProfessionalDto
  specialty: Specialty  // @IsEnum(Specialty) @IsNotEmpty
  userId: string        // @IsMongoId @IsNotEmpty
  cpf: string           // @IsString @IsNotEmpty
  registration: string  // @IsString @IsNotEmpty
  address: AddressDto   // @ValidateNested @Type(() => AddressDto)
  phone?: string        // @IsString @IsOptional
  description?: string  // @IsString @IsOptional
```

### `professionals/dto/update-professional.dto.ts` ✅ (updated sprint 06)
```typescript
export class UpdateProfessionalDto  // all optional
  specialty?: Specialty
  cpf?: string
  registration?: string
  address?: AddressDto
  phone?: string
  description?: string
```

### `professionals/dto/update-weekly-slots.dto.ts` ✅ (sprint 08)
```typescript
export class UpdateWeeklySlotsDto
  weeklySlots: WeeklySlotDto[]  // @ValidateNested({ each: true }) @Type(() => WeeklySlotDto) @ArrayMaxSize(50)
```

### `professionals/professionals.service.ts` ✅ (updated: remove returns ProfessionalDocument)
```typescript
@Injectable()
export class ProfessionalsService

create(dto: CreateProfessionalDto): Promise<ProfessionalDocument>
  // validates userId ObjectId; catches 11000 → ConflictException
findAll(): Promise<ProfessionalDocument[]>
findById(id: string): Promise<ProfessionalDocument>
update(id: string, dto: UpdateProfessionalDto): Promise<ProfessionalDocument>
remove(id: string): Promise<ProfessionalDocument>  // returns deleted doc

// ⚠️ findByUserId(userId: string) is called by ProfileService but NOT yet implemented
```

### `professionals/professionals.controller.ts` ✅
```typescript
@Controller('professionals') @UseGuards(JwtAuthGuard, RolesGuard)
export class ProfessionalsController
  POST   /professionals       @Roles(CLINIC)   → create()
  GET    /professionals                        → findAll()
  GET    /professionals/:id                    → findOne()
  PUT    /professionals/:id   @Roles(CLINIC)   → update()
  DELETE /professionals/:id   @Roles(CLINIC)   → remove()
```

### `professionals/professionals.module.ts` ✅
```typescript
@Module({
  imports: [MongooseModule.forFeature([Professional])],
  providers: [ProfessionalsService],
  exports: [ProfessionalsService, MongooseModule],
})
export class ProfessionalsModule
```

### `professionals/clinic-professionals.service.ts` ✅
```typescript
@Injectable()
export class ClinicProfessionalsService
  assignProfessionalToClinic(clinicId, professionalId): Promise<ClinicProfessionalDocument>
  getProfessionalsByClinic(clinicId): Promise<ProfessionalDocument[]>
  removeProfessionalFromClinic(clinicId, professionalId): Promise<{ success: boolean }>
```

### `professionals/clinic-professionals.controller.ts` ✅
```typescript
@Controller('clinics') @UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicProfessionalsController
  POST   /clinics/:clinicId/professionals/:professionalId   @Roles(CLINIC, ATTENDANT) → assign
  GET    /clinics/:clinicId/professionals                                              → list
  DELETE /clinics/:clinicId/professionals/:professionalId   @Roles(CLINIC, ATTENDANT) → remove
```

### `professionals/clinic-professionals.module.ts` ✅
```typescript
@Module({
  imports: [
    MongooseModule.forFeature([ClinicProfessional, Professional]),
    ClinicsModule,
    ProfessionalsModule,
  ],
  providers: [ClinicProfessionalsService],
  exports: [ClinicProfessionalsService],
})
export class ClinicProfessionalsModule
```

---

## Appointments — `apps/api/src/appointments`

### `appointments/schemas/appointment.schema.ts` ✅
```typescript
export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Appointment
  clinicId: Types.ObjectId        // required
  professionalId: Types.ObjectId  // required
  patientId: Types.ObjectId       // required
  startAt: Date                   // required
  endAt: Date                     // required
  durationMinutes: number         // required
  status: AppointmentStatus       // default: SCHEDULED
  notes?: string

export type AppointmentDocument = Appointment & Document
export const AppointmentSchema = SchemaFactory.createForClass(Appointment)
```

### `appointments/dto/create-appointment.dto.ts` ✅
### `appointments/dto/update-appointment.dto.ts` ✅
### `appointments/dto/update-appointment-status.dto.ts` ✅
### `appointments/dto/get-appointments-query.dto.ts` ✅

### `appointments/appointments.service.ts` ✅ (updated sprints 09+10)
```typescript
@Injectable()
export class AppointmentsService
// Injects: Model<AppointmentDocument>, ClinicsService

create(dto: CreateAppointmentDto): Promise<AppointmentDocument>
  // validates date range; calls checkConflict(professionalId, startAt, endAt, clinicId)

createForPatient(dto: CreateAppointmentDto): Promise<AppointmentDocument>
  // validates date range; checkConflict; also calls checkCrossClinicInterval (RN04)

findAll(): Promise<AppointmentDocument[]>
  // NOTE: current impl does NOT filter by query params — ignores the GetAppointmentsQueryDto
  // that the controller passes (discrepancy introduced in refactor)

findById(id: string): Promise<AppointmentDocument>
  // throws NotFoundException if not found

update(id: string, dto: UpdateAppointmentDto): Promise<AppointmentDocument>
  // re-runs checkConflict excluding self

remove(id: string): Promise<void>
  // ⚠️ controller calls cancel() and updateStatus() which are NOT yet implemented

private validateDateRange(startAt, endAt): void
private checkConflict(professionalId, startAt, endAt, clinicId, excludeId?): Promise<void>
  // loads clinic.linkedScheduling; if true uses strict overlap ($lt/$gt),
  // if false uses inclusive ($lte/$gte) to block adjacent slots
private checkCrossClinicInterval(patientId, clinicId, startAt, endAt): Promise<void>
  // 30-min window around startAt/endAt; queries for patient appts at OTHER clinic
```

### `appointments/appointments.controller.ts` ✅
```typescript
@Controller('appointments') @UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController
  POST   /appointments                @Roles(CLINIC, ATTENDANT)              → create()
  GET    /appointments                                                        → findAll()
  GET    /appointments/:id                                                    → findById()
  PUT    /appointments/:id            @Roles(CLINIC, ATTENDANT)              → update()
  PATCH  /appointments/:id/status     @Roles(CLINIC, ATTENDANT, PROFESSIONAL) → updateStatus()  ⚠️ service method missing
  DELETE /appointments/:id            @Roles(CLINIC, ATTENDANT) @HttpCode(204) → cancel()       ⚠️ service method missing
```

### `appointments/appointments.module.ts` ✅
### `appointments/tests/appointments.service.spec.ts` ✅ — tests rewritten in recent commit

---

## Subscriptions — `apps/api/src/subscriptions`

### `subscriptions/schemas/subscription.schema.ts` ✅
```typescript
export enum SubscriptionPlan { FREE = 'free', BASIC = 'basic', PRO = 'pro' }

export const PLAN_PROFESSIONAL_LIMITS: Record<SubscriptionPlan, number>
// FREE: 2, BASIC: 10, PRO: -1 (unlimited)

@Schema({ timestamps: true })
export class Subscription
  clinicId: Types.ObjectId   // ref: 'Clinic', required, unique
  plan: SubscriptionPlan     // default: FREE
  status: SubscriptionStatus // from clinics/schemas/clinic.schema; default: TRIAL
  expiresAt: Date            // required
```

### `subscriptions/constants/subscription.constants.ts` ✅
### `subscriptions/dto/create-subscription.dto.ts` ✅
### `subscriptions/dto/update-subscription.dto.ts` ✅

### `subscriptions/subscriptions.service.ts` ✅
```typescript
create(dto): Promise<SubscriptionDocument>
findByClinicId(clinicId): Promise<SubscriptionDocument | null>
findById(id): Promise<SubscriptionDocument>
update(id, dto): Promise<SubscriptionDocument>
cancel(id): Promise<SubscriptionDocument>
enforceClinicProfessionalLimit(clinicId, currentCount): Promise<void>
```

### `subscriptions/subscriptions.controller.ts` ✅
```typescript
@Controller('subscriptions') @UseGuards(JwtAuthGuard, RolesGuard)
  POST  /subscriptions                @Roles(CLINIC)  → create()
  GET   /subscriptions/clinic/:clinicId               → findByClinicId()
  GET   /subscriptions/:id                            → findById()
  PUT   /subscriptions/:id            @Roles(CLINIC)  → update()
  POST  /subscriptions/:id/cancel     @Roles(CLINIC)  → cancel()
```

### `subscriptions/subscriptions.module.ts` ✅
### `subscriptions/tests/subscriptions.service.spec.ts` ✅ — 18 tests

---

## Chat — `apps/api/src/chat` (sprints 05 + 07)

### `chat/schemas/chat-session.schema.ts` ✅
```typescript
@Schema({ timestamps: true })
export class ChatSession
  userId: Types.ObjectId           // ref: 'User', required
  clinicId?: Types.ObjectId        // ref: 'Clinic', optional
  recommendedSpecialty?: Specialty // set once when triage completes (sprint 07)
  disclaimerShown: boolean         // default: false (sprint 07)

export type ChatSessionDocument = ChatSession & Document
export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession)
// Index: { userId, createdAt: -1 }
```

### `chat/schemas/chat-message.schema.ts` ✅
```typescript
export enum MessageRole { USER = 'user', ASSISTANT = 'assistant' }

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ChatMessage
  sessionId: Types.ObjectId  // ref: 'ChatSession', required
  role: MessageRole           // required
  content: string             // required, maxlength 4096

export type ChatMessageDocument = ChatMessage & Document
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage)
// Index: { sessionId, createdAt: 1 }
```

### `chat/dto/create-chat-session.dto.ts` ✅
```typescript
export class CreateChatSessionDto
  clinicId?: string  // @IsMongoId @IsOptional
```

### `chat/dto/create-chat-message.dto.ts` ✅
```typescript
export class CreateChatMessageDto
  content: string  // @IsString @MinLength(1)
```

### `chat/dto/send-message-response.dto.ts` ✅
```typescript
export interface RecommendationDto {
  specialty: Specialty;
  reasoning: string;
}
export interface SendMessageResponse {
  message: ChatMessageDocument;
  recommendation: RecommendationDto | null;
}
```

### `chat/dto/get-chat-messages-query.dto.ts` ✅

### `chat/enums/chat-session-type.enum.ts` ✅
```typescript
export enum ChatSessionType { STANDARD = 'standard', TRIAGE = 'triage' }
```

### `chat/constants/triage-prompt.ts` ✅ (sprint 07)
```typescript
export const TRIAGE_SYSTEM_PROMPT: string
// Brazilian PT triage prompt — instructs LLM to output JSON:
// { "recommendation": "<specialty>", "reasoning": "<text>" }
// after 4–6 questions; includes CFM disclaimer rule
```

### `chat/chat.service.ts` ✅
```typescript
@Injectable()
export class ChatService
// Constants: LLM_MODEL='claude-sonnet-4-6', MAX_CONTEXT_MESSAGES=20, MAX_RESPONSE_TOKENS=1024
// Injects: Model<ChatSessionDocument>, Model<ChatMessageDocument>, Anthropic (from provider)

createSession(dto: { clinicId?: string; userId: string }): Promise<ChatSessionDocument>

listSessions(userId: string): Promise<ChatSessionDocument[]>
  // sorted by updatedAt desc

sendMessage(sessionId: string, dto: CreateChatMessageDto): Promise<SendMessageResponse>
  // 1. findSessionById (throws ConflictException if session.recommendedSpecialty already set)
  // 2. Fetch last MAX_CONTEXT_MESSAGES from DB
  // 3. Save user message
  // 4. Call anthropicClient.messages.create with TRIAGE_SYSTEM_PROMPT
  // 5. Call parseRecommendation on response text
  // 6. Save assistant message
  // 7. If recommendation found, update session.recommendedSpecialty
  // 8. Set disclaimerShown=true on first message

listMessages(sessionId: string): Promise<ChatMessageDocument[]>
  // sorted by createdAt asc

parseRecommendation(content: string): RecommendationDto | null
  // extracts JSON from response; validates specialty against Specialty enum
  // public method (not private) — used in tests

private findSessionById(sessionId: string): Promise<ChatSessionDocument>
```

### `chat/chat.controller.ts` ✅
```typescript
@Controller('chat') @UseGuards(JwtAuthGuard)
export class ChatController
  POST /chat/sessions                         → createSession()
  GET  /chat/sessions                         → listSessions()
  POST /chat/sessions/:sessionId/messages     → sendMessage()
  GET  /chat/sessions/:sessionId/messages     → listMessages()
// ParseMongoIdPipe on :sessionId
```

### `chat/chat.module.ts` ✅
```typescript
@Module({
  imports: [MongooseModule.forFeature([ChatSession, ChatMessage])],
  controllers: [ChatController],
  providers: [ChatService, { provide: Anthropic, useFactory: ... }],
  exports: [ChatService],
})
export class ChatModule
// ⚠️ Not yet imported in AppModule
```

### `chat/tests/chat.service.spec.ts` ✅ — tests for both sprint 05 and sprint 07 features

---

## Search — `apps/api/src/search` (sprint 06)

### `search/dto/search-query.dto.ts` ✅
```typescript
export class SearchQueryDto
  specialty?: Specialty         // @IsEnum @IsOptional
  city?: string                 // @IsString @IsOptional
  type?: 'clinic' | 'professional' | 'all'  // @IsOptional
  page?: number                 // @IsInt @Min(1) @IsOptional, default 1
  limit?: number                // @IsInt @Min(1) @Max(50) @IsOptional, default 20
```

### `search/interfaces/search-result.interface.ts` ✅
```typescript
export interface SearchResult {
  clinics: ClinicDocument[];
  professionals: ProfessionalDocument[];
  total: number;
  page: number;
  limit: number;
}
```

### `search/search.service.ts` ✅
```typescript
@Injectable()
export class SearchService
// Injects: Model<ClinicDocument>, Model<ProfessionalDocument>

search(query: SearchQueryDto): Promise<SearchResult>
  // filters clinics by specialties.$in and address.city
  // filters professionals by specialty and address.city
  // respects query.type ('clinic' | 'professional' | 'all')
  // TODO (Sprint 11): filter professionals by active subscription (RN20)

findClinicById(id: string): Promise<ClinicDocument>
  // no auth required; throws NotFoundException

findProfessionalById(id: string): Promise<ProfessionalDocument>
  // no auth required; throws NotFoundException
```

### `search/search.controller.ts` ✅
```typescript
@Controller('search')
// NO @UseGuards — all endpoints are PUBLIC
export class SearchController
  GET /search                      → search()
  GET /search/clinics/:id          → findClinicById()
  GET /search/professionals/:id    → findProfessionalById()
```

### `search/search.module.ts` ✅
```typescript
@Module({
  imports: [MongooseModule.forFeature([Clinic, Professional])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule
// ⚠️ Not yet imported in AppModule
```

### `search/tests/search.service.spec.ts` ✅ — 11 tests

---

## Availability — `apps/api/src/availability` (sprints 08)

### `availability/schemas/professional-availability.schema.ts` ✅
```typescript
@Schema({ timestamps: true })
export class ProfessionalAvailability
  professionalId: Types.ObjectId  // ref: 'Professional', required
  date: Date                      // required (normalized to UTC midnight)
  isUnavailable: boolean          // default: false
  customSlots: WeeklySlot[]       // default: [] — replaces weekly slots for that day

export type ProfessionalAvailabilityDocument = ProfessionalAvailability & Document
export const ProfessionalAvailabilitySchema = SchemaFactory.createForClass(ProfessionalAvailability)
// Unique index: { professionalId, date }
```

### `availability/dto/available-slot.dto.ts` ✅
```typescript
export class AvailableSlotDto
  date: string        // YYYY-MM-DD
  startAt: Date
  endAt: Date
  durationMinutes: number
```

### `availability/dto/create-professional-availability.dto.ts` ✅
```typescript
export class CreateProfessionalAvailabilityDto
  date: string          // @IsDateString
  isUnavailable?: boolean
  customSlots?: WeeklySlotDto[]
```

### `availability/dto/update-professional-availability.dto.ts` ✅
```typescript
export class UpdateProfessionalAvailabilityDto  // all optional
  date?: string
  isUnavailable?: boolean
  customSlots?: WeeklySlotDto[]
```

### `availability/dto/get-availability-query.dto.ts` ✅
```typescript
export class GetAvailabilityQueryDto
  date: string  // @IsDateString — single date (YYYY-MM-DD)
```

### `availability/utils/compute-slots.ts` ✅
```typescript
export interface AvailableSlot {
  date: string; startAt: Date; endAt: Date; durationMinutes: number;
}

export function computeSlotsForDay(
  date: Date,
  weeklySlots: WeeklySlot[],
  appointments: { startAt: Date; endAt: Date }[],
): AvailableSlot[]
// Pure function — filters by UTC dayOfWeek, generates slots per window, excludes overlapping appts
// Uses UTC dates throughout; sorts result by startAt
```

### `availability/availability.service.ts` ✅
```typescript
@Injectable()
export class AvailabilityService
// Injects: Model<ProfessionalAvailabilityDocument>, Model<AppointmentDocument>, ProfessionalsService

create(professionalId, dto, currentUserId, currentUserRole): Promise<ProfessionalAvailabilityDocument>
  // enforceOwnership; validates isUnavailable+customSlots; catches 11000 → ConflictException

findByProfessionalAndDate(professionalId, dateString): Promise<ProfessionalAvailabilityDocument | null>

findById(availabilityId): Promise<ProfessionalAvailabilityDocument>

update(availabilityId, dto, currentUserId, currentUserRole): Promise<ProfessionalAvailabilityDocument>
  // enforceOwnership; validates slots; catches 11000

remove(availabilityId, currentUserId, currentUserRole): Promise<{ success: boolean }>
  // enforceOwnership; findByIdAndDelete

getAvailableSlots(professionalId, dateString): Promise<AvailableSlotDto[]>
  // fetches professional.weeklySlots; checks override for the date;
  // fetches non-CANCELLED appointments for the day;
  // calls computeSlotsForDay

private enforceOwnership(professionalId, currentUserId, currentUserRole): Promise<void>
  // only restricts when role=PROFESSIONAL; checks professional.userId === currentUserId
private normalizeDateToUtcMidnight(dateString): Date
private validateAvailabilitySlots(isUnavailable, customSlots): void
private isDuplicateKeyError(error): boolean
```

### `availability/availability.controller.ts` ✅
```typescript
@Controller() @UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController

  POST  professionals/:professionalId/availability         @Roles(PROFESSIONAL, CLINIC, ATTENDANT) → create()
  GET   professionals/:professionalId/availability         (public? no guard via @Roles omitted)   → findByProfessionalAndDate()
  GET   professionals/:professionalId/availability/slots   (no @Roles)                             → getAvailableSlots()
  PATCH availability/:availabilityId                       @Roles(PROFESSIONAL, CLINIC, ATTENDANT) → update()
  DELETE availability/:availabilityId                      @Roles(PROFESSIONAL, CLINIC, ATTENDANT) @HttpCode(204) → remove()
```

### `availability/availability.module.ts` ✅
```typescript
@Module({
  imports: [
    MongooseModule.forFeature([ProfessionalAvailability, Appointment]),
    ProfessionalsModule,
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule
// ⚠️ Not yet imported in AppModule
```

### Availability tests
```
availability/tests/slot-computation.spec.ts       ✅ — pure function tests
availability/tests/availability.service.spec.ts   ✅ — service tests
```

---

## Patients — `apps/api/src/patients` (sprint 10)

### `patients/schemas/patient.schema.ts` ✅
```typescript
@Schema({ timestamps: true })
export class Patient
  userId: Types.ObjectId  // ref: 'User', required, unique
  name: string            // required
  dateOfBirth: Date       // required
  phone?: string          // optional
  address?: Address       // optional subdocument (from common/schemas/address.schema)

export type PatientDocument = Patient & Document
export const PatientSchema = SchemaFactory.createForClass(Patient)
// Index: { userId } unique
```

### `patients/dto/update-patient-profile.dto.ts` ✅
```typescript
export class UpdatePatientProfileDto
  name?: string           // @IsString @IsOptional
  dateOfBirth?: string    // @IsDateString @IsOptional
  phone?: string          // @IsString @IsOptional
  address?: AddressDto    // @ValidateNested @Type @IsOptional
```

### `patients/patients.module.ts` ✅
```typescript
@Module({
  imports: [MongooseModule.forFeature([Patient])],
  providers: [],
  exports: [MongooseModule],
})
export class PatientsModule
// ⚠️ Not yet imported in AppModule
```

---

## Profile — `apps/api/src/profile` (sprint 10)

### `profile/dto/update-clinic-profile.dto.ts` ✅
```typescript
export class UpdateClinicProfileDto extends UpdateClinicDto
// No additional fields — scoped "update my clinic" without an id param
```

### `profile/dto/update-professional-profile.dto.ts` ✅
```typescript
export class UpdateProfessionalProfileDto extends UpdateProfessionalDto
```

### `profile/profile.service.ts` ✅
```typescript
@Injectable()
export class ProfileService
// Injects: Model<UserDocument> ('User'), Model<PatientDocument>, ClinicsService, ProfessionalsService

getMyProfile(userId: string): Promise<{ user: any; profile: any }>
  // loads user; routes to Patient/Clinic/Professional profile by role
  // ⚠️ calls clinicsService.findByUserId and professionalsService.findByUserId
  //    which are NOT yet implemented (will throw at runtime)

updatePatientProfile(userId, dto): Promise<PatientDocument>
  // findOneAndUpdate with upsert: true — creates on first call

updateClinicProfile(userId, dto): Promise<ClinicDocument>
  // ⚠️ calls clinicsService.findByUserId (not yet implemented)

updateProfessionalProfile(userId, dto): Promise<ProfessionalDocument>
  // ⚠️ calls professionalsService.findByUserId (not yet implemented)
```

### `profile/profile.controller.ts` ✅
```typescript
@Controller('profile') @UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileController
  GET /profile/me                   → getMyProfile()
  PUT /profile/me/patient           @Roles(PATIENT)       → updatePatientProfile()
  PUT /profile/me/clinic            @Roles(CLINIC)        → updateClinicProfile()
  PUT /profile/me/professional      @Roles(PROFESSIONAL)  → updateProfessionalProfile()
```

### `profile/profile.module.ts` ✅
```typescript
@Module({
  imports: [PatientsModule, ClinicsModule, ProfessionalsModule, MongooseModule (User)],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule
// ⚠️ Not yet imported in AppModule
```

### `profile/tests/profile.service.spec.ts` ✅ — 6 tests

---

## App Root — `apps/api/src`

### `app.module.ts` ✅ (current state — simplified)
Imports: ConfigModule (global), MongooseModule (forRootAsync), RedisModule (global),
AuthModule, UsersModule, ClinicsModule, ProfessionalsModule, ClinicProfessionalsModule

> **⚠️ Missing imports:** AppointmentsModule, SubscriptionsModule, ChatModule, SearchModule,
> AvailabilityModule, PatientsModule, ProfileModule — all exist on disk but are not yet wired up.

### `main.ts` ✅
Bootstrap: ValidationPipe (whitelist, forbidNonWhitelisted, transform), AllExceptionsFilter,
enableCors(), port from `process.env.PORT ?? 3000`

---

## What Needs to Be Built (Sprint 11)

| Module | Status | Notes |
|---|---|---|
| Wire up all modules in `app.module.ts` | ❌ | AppointmentsModule, SubscriptionsModule, ChatModule, SearchModule, AvailabilityModule, PatientsModule, ProfileModule |
| `findByUserId` in ClinicsService | ❌ | Required by ProfileService |
| `findByUserId` in ProfessionalsService | ❌ | Required by ProfileService |
| `updateStatus` + `cancel` in AppointmentsService | ❌ | Referenced by AppointmentsController |
| `notifications/` module (AWS SES) | ❌ | Sprint 11 — notify on appt created/confirmed/cancelled |
| `availability/services/schedule.service.ts` | ❌ | Sprint 11 — combined provider schedule view |
| Subscription generalization (ownerType/ownerId) | ❌ | Sprint 11 — support professional subscriptions |
| Search: RN20 enforcement | ❌ | Sprint 11 — filter professionals without active sub |
| Register AttendantsService + AttendantsController in ClinicsModule | ❌ | Sprint 10 leftover |
