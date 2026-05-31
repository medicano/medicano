import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { GetAvailabilityQueryDto } from './dto/get-availability-query.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  getConfig(@Query('professionalId', ParseMongoIdPipe) professionalId: string) {
    return this.availabilityService.getConfig(professionalId);
  }

  @Put(':professionalId')
  saveConfig(
    @Param('professionalId', ParseMongoIdPipe) professionalId: string,
    @Body() config: Record<string, unknown>,
  ) {
    return this.availabilityService.saveConfig(professionalId, config);
  }

  @Get(':professionalId/next')
  getNextAvailableDay(
    @Param('professionalId', ParseMongoIdPipe) professionalId: string,
  ) {
    return this.availabilityService.getNextAvailableDay(professionalId);
  }

  @Get(':professionalId/slots')
  getAvailableSlots(
    @Param('professionalId', ParseMongoIdPipe) professionalId: string,
    @Query() query: GetAvailabilityQueryDto,
  ) {
    return this.availabilityService.getAvailableSlots(
      professionalId,
      query.fromDate,
      query.toDate,
    );
  }
}
