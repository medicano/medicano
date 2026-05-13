import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { ScheduleService } from './services/schedule.service';
import {
  ProfessionalAvailability,
  ProfessionalAvailabilitySchema,
} from './schemas/professional-availability.schema';
import { UserSchema } from '../auth/schemas/user.schema';
import {
  ClinicProfessionalSchema,
} from '../professionals/schemas/clinic-professional.schema';
import { Professional, ProfessionalSchema } from '../professionals/schemas/professional.schema';
import { Appointment, AppointmentSchema } from '../appointments/schemas/appointment.schema';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ProfessionalAvailability.name,
        schema: ProfessionalAvailabilitySchema,
      },
      { name: 'User', schema: UserSchema },
      { name: 'ClinicProfessional', schema: ClinicProfessionalSchema },
      { name: Professional.name, schema: ProfessionalSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    forwardRef(() => ProfessionalsModule),
    forwardRef(() => AppointmentsModule),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, ScheduleService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
