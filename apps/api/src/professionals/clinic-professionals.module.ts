import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ClinicsModule } from '../clinics/clinics.module';
import { ClinicProfessionalsController } from './clinic-professionals.controller';
import { ClinicProfessionalsService } from './clinic-professionals.service';
import { ProfessionalsModule } from './professionals.module';
import {
  ClinicProfessional,
  ClinicProfessionalSchema,
} from './schemas/clinic-professional.schema';
import {
  Professional,
  ProfessionalSchema,
} from './schemas/professional.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ClinicProfessional.name,
        schema: ClinicProfessionalSchema,
      },
      {
        name: Professional.name,
        schema: ProfessionalSchema,
      },
    ]),
    ClinicsModule,
    ProfessionalsModule,
  ],
  controllers: [ClinicProfessionalsController],
  providers: [ClinicProfessionalsService],
  exports: [ClinicProfessionalsService],
})
export class ClinicProfessionalsModule {}
