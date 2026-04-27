import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { IScheduleResponse } from './services/schedule.service';

@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly scheduleService: ScheduleService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL, Role.CLINIC, Role.ATTENDANT)
  @Get('schedule/professionals/:professionalId')
  getProviderSchedule(
    @Param('professionalId', ParseMongoIdPipe) professionalId: string,
    @Query() query: GetScheduleQueryDto,
    @CurrentUser() user: any,
  ): Promise<IScheduleResponse> {
    const currentUserId: string =
      typeof user === 'string' ? user : user.userId ?? user._id?.toString();
    return this.scheduleService.getProviderSchedule(
      professionalId,
      query,
      currentUserId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFESSIONAL, Role.CLINIC, Role.ATTENDANT)
  @Get(':professionalId')
  getAvailableSlots(
    @Param('professionalId', ParseMongoIdPipe) professionalId: string,
    @Query() query: GetAvailabilityQueryDto,
  ) {
    return this.availabilityService.getAvailableSlots(professionalId, query.date);
  }
}
