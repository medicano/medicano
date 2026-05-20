import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { UserDocument } from './schemas/user.schema';
import { LoginAttendantDto } from './dto/login-attendant.dto';
import { LoginStandardDto } from './dto/login-standard.dto';
import { SignupDto } from './dto/signup.dto';

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
    @InjectModel(Patient.name) private readonly patientModel: Model<PatientDocument>,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
    const user = await this.usersService.createUser(dto);
    const userId = user._id.toString();

    if (dto.role === Role.PATIENT) {
      await this.createPatientDocument(userId, dto);
    }

    const token = this.signToken(userId, user.role as Role);
    await this.redisService.saveToken(userId, token, TOKEN_TTL);

    return { accessToken: token, user: this.toAuthUser(user) };
  }

  async loginStandard(dto: LoginStandardDto): Promise<AuthResponse> {
    let user: UserDocument | null = null;

    for (const role of STANDARD_ROLES) {
      user = await this.usersService.findByEmailAndRole(dto.email, role);
      if (user) {
        break;
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await user.comparePassword(dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userId = user._id.toString();
    const token = this.signToken(userId, user.role as Role);

    await this.redisService.saveToken(userId, token, TOKEN_TTL);

    return { accessToken: token, user: this.toAuthUser(user) };
  }

  async loginAttendant(dto: LoginAttendantDto): Promise<AuthResponse> {
    const user = await this.usersService.findByClinicIdAndUsername(
      dto.clinicId,
      dto.username,
    );

    if (!user || user.role !== Role.ATTENDANT) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await user.comparePassword(dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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
    const dob = new Date(dto.dateOfBirth!);
    const ageMs = Date.now() - dob.getTime();
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);

    if (ageYears < 0 || ageYears > MAX_AGE_YEARS) {
      throw new BadRequestException('Data de nascimento inválida');
    }

    await this.patientModel.create({
      userId,
      name: dto.name,
      dateOfBirth: dob,
      phone: this.normalizePhone(dto.phone!),
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
