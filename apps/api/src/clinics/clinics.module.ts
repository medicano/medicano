import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicsController } from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { Clinic, ClinicSchema } from './schemas/clinic.schema';
import { AttendantsController } from './attendants/attendants.controller';
import { AttendantsService } from './attendants/attendants.service';
import { Attendant, AttendantSchema } from './attendants/schemas/attendant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Clinic.name, schema: ClinicSchema },
      { name: Attendant.name, schema: AttendantSchema },
    ]),
  ],
  controllers: [ClinicsController, AttendantsController],
  providers: [ClinicsService, AttendantsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
