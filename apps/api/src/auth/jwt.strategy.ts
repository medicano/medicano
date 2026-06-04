import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../redis/redis.service';
import { Role } from '../common/enums/role.enum';
import { AUTH_COOKIE_NAME } from './auth-cookie';

// Lê o token do cookie httpOnly (caminho principal). O header Authorization
// segue aceito como fallback (clientes não-browser / streaming legado).
function extractJwtFromCookie(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[AUTH_COOKIE_NAME] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
      passReqToCallback: false,
    });
  }

  async validate(payload: { sub: string; role: Role }): Promise<{ userId: string; role: Role }> {
    const token = await this.redisService.getToken(payload.sub);
    if (!token) {
      throw new UnauthorizedException('Sessão expirada ou revogada');
    }
    return { userId: payload.sub, role: payload.role };
  }
}
