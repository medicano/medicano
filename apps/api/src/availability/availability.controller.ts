import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { ScheduleService } from './services/schedule.service';
import { GetAvailabilityQueryDto } from './dto/get-availability-query.dto';
import { GetScheduleQueryDto } from './dto/get-schedule-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly scheduleService: ScheduleService,
  ) {}

  @Get('professionals/:professionalId')
  getAvailability(
    @Param('professionalId', ParseMongoIdPipe) professionalId: string,
    @Query() query: GetAvailabilityQueryDto,
  ) {
    return this.availabilityService.getAvailableSlots(professionalId, query);
  }

  @Get('schedule/professionals/:professionalId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL, Role.CLINIC, Role.ATTENDANT)
  getProviderSchedule(
    @Param('professionalId', ParseMongoIdPipe) professionalId: string,
    @Query() query: GetScheduleQueryDto,
    @CurrentUser() userId: string,
  ) {
    return this.scheduleService.getProviderSchedule(
      professionalId,
      query,
      userId,
    );
  }
}
