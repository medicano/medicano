import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';
import { Professional, ProfessionalDocument } from '../professionals/schemas/professional.schema';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { UserDocument } from './schemas/user.schema';
import { LoginAttendantDto } from './dto/login-attendant.dto';
import { LoginStandardDto } from './dto/login-standard.dto';
import { SignupDto } from './dto/signup.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionPlan } from '../subscriptions/constants/subscription.constants';

const TOKEN_TTL = 7 * 24 * 3600;
const STANDARD_ROLES = [Role.PATIENT, Role.CLINIC, Role.PROFESSIONAL];
const MAX_AGE_YEARS = 120;

export interface AuthUser {
  id: string;
  role: string;
  email?: string;
  username?: string;
  clinicId?: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectModel(Patient.name) private readonly patientModel: Model<PatientDocument>,
    @InjectModel(Clinic.name) private readonly clinicModel: Model<ClinicDocument>,
    @InjectModel(Professional.name) private readonly professionalModel: Model<ProfessionalDocument>,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
    const user = await this.usersService.createUser(dto);
    const userId = user._id.toString();

    // No native transaction (MongoDB requires a replica set): if any role
    // document fails to create, compensate by removing what was created so we
    // never leave an orphaned user that can log in but has no profile.
    // (Mongoose casts the userId string to ObjectId per the schema.)
    let createdClinicId: Types.ObjectId | null = null;
    try {
      if (dto.role === Role.PATIENT) {
        await this.createPatientDocument(userId, dto);
      } else if (dto.role === Role.CLINIC) {
        const clinic = await this.clinicModel.create({
          // Store as ObjectId so profile lookups by userId match (the @Prop
          // ObjectId type does not cast a raw string here).
          userId: new Types.ObjectId(userId),
          name: dto.name,
          cnpj: dto.cnpj?.replace(/\D/g, ''),
          // Seed the contact email with the signup email; editable later.
          email: dto.email,
        });
        createdClinicId = clinic._id;
        await this.subscriptionsService.create({ clinicId: clinic._id.toString(), plan: SubscriptionPlan.FREE });
      } else if (dto.role === Role.PROFESSIONAL) {
        await this.professionalModel.create({
          userId: new Types.ObjectId(userId),
          name: dto.name,
          specialty: dto.specialty,
          registration: dto.regNum,
          cpf: dto.cpf,
          // Seed the contact email with the signup email; editable later.
          email: dto.email,
        });
      }
    } catch (error) {
      if (createdClinicId) {
        await this.clinicModel.deleteOne({ _id: createdClinicId }).exec().catch(() => undefined);
      }
      await this.usersService.deleteById(userId).catch(() => undefined);
      throw error;
    }

    const token = this.signToken(userId, user.role as Role);
    await this.redisService.saveToken(userId, token, TOKEN_TTL);

    return { accessToken: token, user: this.toAuthUser(user) };
  }

  async loginStandard(dto: LoginStandardDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !STANDARD_ROLES.includes(user.role as Role)) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await user.comparePassword(dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const userId = user._id.toString();
    const token = this.signToken(userId, user.role as Role);

    await this.redisService.saveToken(userId, token, TOKEN_TTL);

    return { accessToken: token, user: this.toAuthUser(user) };
  }

  async loginAttendant(dto: LoginAttendantDto): Promise<AuthResponse> {
    let resolvedClinicId = dto.clinicId;
    if (!Types.ObjectId.isValid(dto.clinicId)) {
      const clinic = await this.clinicModel
        .findOne({ customCode: dto.clinicId })
        .select('_id')
        .exec();
      if (!clinic) {
        throw new UnauthorizedException('Credenciais inválidas');
      }
      resolvedClinicId = clinic._id.toString();
    }

    const user = await this.usersService.findByClinicIdAndUsername(
      resolvedClinicId,
      dto.username,
    );

    if (!user || user.role !== Role.ATTENDANT) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await user.comparePassword(dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const userId = user._id.toString();
    const token = this.signToken(userId, user.role as Role);

    await this.redisService.saveToken(userId, token, TOKEN_TTL);

    return { accessToken: token, user: this.toAuthUser(user) };
  }

  async logout(userId: string): Promise<void> {
    await this.redisService.removeToken(userId);
  }

  private async createPatientDocument(userId: string, dto: SignupDto): Promise<void> {
    if (!dto.phone) {
      throw new BadRequestException('Telefone é obrigatório para pacientes');
    }

    // Data de nascimento é opcional (informação de contexto). Quando vier,
    // valida que é uma data plausível.
    let dob: Date | undefined;
    if (dto.dateOfBirth) {
      dob = new Date(dto.dateOfBirth);
      const ageYears = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears < 0 || ageYears > MAX_AGE_YEARS) {
        throw new BadRequestException('Data de nascimento inválida');
      }
    }

    await this.patientModel.create({
      userId: new Types.ObjectId(userId),
      name: dto.name,
      ...(dob ? { dateOfBirth: dob } : {}),
      phone: this.normalizePhone(dto.phone),
      gender: dto.gender,
      pronouns: dto.pronouns,
      cep: dto.cep,
      city: dto.city,
      state: dto.state,
    });
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private toAuthUser(user: UserDocument): AuthUser {
    return {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      username: user.username,
      clinicId: user.clinicId?.toString(),
      name: user.displayName,
    };
  }

  private signToken(userId: string, role: Role): string {
    return this.jwtService.sign({ sub: userId, role });
  }
}
