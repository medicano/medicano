import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicProfessionalsController } from './clinic-professionals.controller';
import { ClinicProfessionalsService } from './clinic-professionals.service';
import {
  ClinicProfessional,
  ClinicProfessionalSchema,
} from './schemas/clinic-professional.schema';
import { Professional, ProfessionalSchema } from './schemas/professional.schema';
import { ClinicsModule } from '../clinics/clinics.module';
import { ProfessionalsModule } from './professionals.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClinicProfessional.name, schema: ClinicProfessionalSchema },
      { name: Professional.name, schema: ProfessionalSchema },
    ]),
    ClinicsModule,
    ProfessionalsModule,
    SubscriptionsModule,
    AppointmentsModule,
  ],
  controllers: [ClinicProfessionalsController],
  providers: [ClinicProfessionalsService],
  exports: [ClinicProfessionalsService],
})
export class ClinicProfessionalsModule {}
