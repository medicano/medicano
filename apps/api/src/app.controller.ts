import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AppService } from './app.service';
import { GeocodingService, GeoCoordinates } from './common/geocoding/geocoding.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly geocodingService: GeocodingService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('location')
  async getClientLocation(@Req() req: Request): Promise<GeoCoordinates | null> {
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : (req.ip ?? '');
    const ip = rawIp.replace(/^::ffff:/, '');
    return this.geocodingService.getLocationByIp(ip);
  }
}
