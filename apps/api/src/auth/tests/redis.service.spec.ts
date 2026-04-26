const mockRedisClient = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
};

jest.mock('ioredis', () =>
  jest.fn().mockImplementation(() => mockRedisClient),
);

import { RedisService } from '../../redis/redis.service';

describe('RedisService', () => {
  let service: RedisService;
  const userId = 'user-id-1';
  const token = 'jwt-token-value';
  const ttl = 7 * 24 * 3600;

  beforeEach(() => {
    service = new RedisService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveToken', () => {
    it('should call setex with correct key format, ttl, and token', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.saveToken(userId, token, ttl);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `auth:token:${userId}`,
        ttl,
        token,
      );
    });

    it('should overwrite existing token when called twice with same userId', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.saveToken(userId, 'first-token', ttl);
      await service.saveToken(userId, 'second-token', ttl);

      expect(mockRedisClient.setex).toHaveBeenNthCalledWith(
        1,
        `auth:token:${userId}`,
        ttl,
        'first-token',
      );
      expect(mockRedisClient.setex).toHaveBeenNthCalledWith(
        2,
        `auth:token:${userId}`,
        ttl,
        'second-token',
      );
    });
  });

  describe('getToken', () => {
    it('should return the stored token', async () => {
      mockRedisClient.get.mockResolvedValue(token);

      await expect(service.getToken(userId)).resolves.toBe(token);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`auth:token:${userId}`);
    });

    it('should return null when no token exists for the user', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(service.getToken(userId)).resolves.toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith(`auth:token:${userId}`);
    });
  });

  describe('validateToken', () => {
    it('should return true when stored token matches provided token', async () => {
      mockRedisClient.get.mockResolvedValue(token);

      await expect(service.validateToken(userId, token)).resolves.toBe(true);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`auth:token:${userId}`);
    });

    it('should return false when stored token differs from provided token', async () => {
      mockRedisClient.get.mockResolvedValue('different-token');

      await expect(service.validateToken(userId, token)).resolves.toBe(false);
    });

    it('should return false when no token is stored', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(service.validateToken(userId, token)).resolves.toBe(false);
    });
  });

  describe('removeToken', () => {
    it('should call del with the correct key format', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.removeToken(userId);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`auth:token:${userId}`);
    });

    it('should not throw when the key does not exist', async () => {
      mockRedisClient.del.mockResolvedValue(0);

      await expect(service.removeToken(userId)).resolves.not.toThrow();
      expect(mockRedisClient.del).toHaveBeenCalledWith(`auth:token:${userId}`);
    });
  });
});
