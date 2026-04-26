import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { ScheduleService } from './services/schedule.service';
import {
  ProfessionalAvailability,
  ProfessionalAvailabilitySchema,
} from './schemas/professional-availability.schema';
import {
  ClinicProfessional,
  ClinicProfessionalSchema,
} from '../professionals/schemas/clinic-professional.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProfessionalAvailability.name, schema: ProfessionalAvailabilitySchema },
      { name: 'User', schema: UserSchema },
      { name: 'ClinicProfessional', schema: ClinicProfessionalSchema },
    ]),
    ProfessionalsModule,
    AppointmentsModule,
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, ScheduleService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
