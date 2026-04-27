import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { GetAvailabilityQueryDto } from './dto/get-availability-query.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':professionalId')
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
