import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IAuthTokens } from '@medicano/types';
import { Role } from '../common/enums/role.enum';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { LoginAttendantDto } from './dto/login-attendant.dto';
import { LoginStandardDto } from './dto/login-standard.dto';
import { SignupDto } from './dto/signup.dto';

const TOKEN_TTL = 7 * 24 * 3600;
const STANDARD_ROLES = [Role.PATIENT, Role.CLINIC, Role.PROFESSIONAL];

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async signup(dto: SignupDto): Promise<IAuthTokens> {
    const user = await this.usersService.createUser(dto);
    const userId = user._id.toString();
    const token = this.signToken(userId, user.role as Role);

    await this.redisService.saveToken(userId, token, TOKEN_TTL);

    return { accessToken: token };
  }

  async loginStandard(dto: LoginStandardDto): Promise<IAuthTokens> {
    let user = null;

    for (const role of STANDARD_ROLES) {
      user = await this.usersService.findByEmailAndRole(dto.email, role);
      if (user) {
        break;
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.comparePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userId = user._id.toString();
    const token = this.signToken(userId, user.role as Role);

    await this.redisService.saveToken(userId, token, TOKEN_TTL);

    return { accessToken: token };
  }

  async loginAttendant(dto: LoginAttendantDto): Promise<IAuthTokens> {
    const user = await this.usersService.findByClinicIdAndUsername(
      dto.clinicId,
      dto.username,
    );

    if (!user || user.role !== Role.ATTENDANT) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.comparePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userId = user._id.toString();
    const token = this.signToken(userId, user.role as Role);

    await this.redisService.saveToken(userId, token, TOKEN_TTL);

    return { accessToken: token };
  }

  async logout(userId: string): Promise<void> {
    await this.redisService.removeToken(userId);
  }

  private signToken(userId: string, role: Role): string {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    return this.jwtService.sign(
      { sub: userId, role },
      { secret: jwtSecret, expiresIn: '7d' },
    );
  }
}
