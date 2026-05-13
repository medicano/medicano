import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
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
