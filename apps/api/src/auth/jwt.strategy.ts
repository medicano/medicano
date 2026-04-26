import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../redis/redis.service';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
      passReqToCallback: false,
    });
  }

  async validate(payload: { sub: string; role: Role }): Promise<{ userId: string; role: Role }> {
    const token = await this.redisService.getToken(payload.sub);
    if (!token) {
      throw new UnauthorizedException('Session expired or revoked');
    }
    return { userId: payload.sub, role: payload.role };
  }
}
