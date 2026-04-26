import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ClinicsController } from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { Clinic, ClinicSchema } from './schemas/clinic.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Clinic.name,
        schema: ClinicSchema,
      },
    ]),
  ],
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService, MongooseModule],
})
export class ClinicsModule {}
