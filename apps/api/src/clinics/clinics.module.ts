import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Clinic, ClinicSchema } from './schemas/clinic.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { ClinicProfessional, ClinicProfessionalSchema } from '../professionals/schemas/clinic-professional.schema';
import { Professional, ProfessionalSchema } from '../professionals/schemas/professional.schema';

import { ClinicsController } from './clinics.controller';
import { AttendantsController } from './controllers/attendants.controller';

import { ClinicsService } from './clinics.service';
import { AttendantsService } from './services/attendants.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Clinic.name, schema: ClinicSchema },
      { name: User.name, schema: UserSchema },
      { name: ClinicProfessional.name, schema: ClinicProfessionalSchema },
      { name: Professional.name, schema: ProfessionalSchema },
    ]),
  ],
  controllers: [ClinicsController, AttendantsController],
  providers: [ClinicsService, AttendantsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
