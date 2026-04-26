import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis(
      this.configService.get('REDIS_URL') || 'redis://localhost:6379',
    );
  }

  async saveToken(
    userId: string,
    token: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.setex(`auth:token:${userId}`, ttlSeconds, token);
  }

  async getToken(userId: string): Promise<string | null> {
    return this.client.get(`auth:token:${userId}`);
  }

  async validateToken(userId: string, token: string): Promise<boolean> {
    const stored = await this.getToken(userId);
    return stored === token;
  }

  async removeToken(userId: string): Promise<void> {
    await this.client.del(`auth:token:${userId}`);
  }
}
