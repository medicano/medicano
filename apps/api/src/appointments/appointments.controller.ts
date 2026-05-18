import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { GetAppointmentsQueryDto } from './dto/get-appointments-query.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.CLINIC, Role.ATTENDANT, Role.PATIENT)
  create(@CurrentUser() userId: string, @Body() dto: CreateAppointmentDto) {
    const resolved = { ...dto, patientId: dto.patientId ?? userId };
    return this.appointmentsService.createAppointment(resolved);
  }

  @Get()
  findAll(@Req() req: any, @Query() query: GetAppointmentsQueryDto) {
    const resolvedQuery = { ...query };
    if (req.user?.role === 'patient' && !resolvedQuery.patientId) {
      resolvedQuery.patientId = req.user.userId;
    }
    return this.appointmentsService.findAll(resolvedQuery);
  }

  @Get(':id')
  findById(@Param('id', ParseMongoIdPipe) id: string) {
    return this.appointmentsService.getAppointmentById(id);
  }

  @Put(':id')
  @Roles(Role.CLINIC, Role.ATTENDANT)
  update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.CLINIC, Role.ATTENDANT, Role.PROFESSIONAL)
  updateStatus(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @Roles(Role.CLINIC, Role.ATTENDANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @CurrentUser() userId: string,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.appointmentsService.cancelAppointment(id, userId, 'provider');
  }
}
