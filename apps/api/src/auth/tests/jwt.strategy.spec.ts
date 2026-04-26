import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../jwt.strategy';
import { Role } from '../../common/enums/role.enum';
import { RedisService } from '../../redis/redis.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const redisService = {
    getToken: jest.fn(),
  };

  const configService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(() => {
    strategy = new JwtStrategy(
      configService as unknown as ConfigService,
      redisService as unknown as RedisService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const payload = {
      sub: 'user-id-1',
      role: Role.PATIENT,
    };

    it('should return authenticated user when token exists in redis', async () => {
      redisService.getToken.mockResolvedValue('stored-token');

      await expect(strategy.validate(payload)).resolves.toEqual({
        userId: payload.sub,
        role: payload.role,
      });
      expect(redisService.getToken).toHaveBeenCalledWith(payload.sub);
    });

    it('should throw UnauthorizedException when redis has no token', async () => {
      redisService.getToken.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(redisService.getToken).toHaveBeenCalledWith(payload.sub);
    });
  });
});
