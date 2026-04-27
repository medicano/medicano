import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicProfessionalsController } from './clinic-professionals.controller';
import { ClinicProfessionalsService } from './clinic-professionals.service';
import {
  ClinicProfessional,
  ClinicProfessionalSchema,
} from './schemas/clinic-professional.schema';
import { ClinicsModule } from '../clinics/clinics.module';
import { ProfessionalsModule } from './professionals.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClinicProfessional.name, schema: ClinicProfessionalSchema },
    ]),
    ClinicsModule,
    ProfessionalsModule,
    SubscriptionsModule,
  ],
  controllers: [ClinicProfessionalsController],
  providers: [ClinicProfessionalsService],
  exports: [ClinicProfessionalsService],
})
export class ClinicProfessionalsModule {}
