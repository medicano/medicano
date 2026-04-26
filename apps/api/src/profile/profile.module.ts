import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { PatientsModule } from '../patients/patients.module';
import { ClinicsModule } from '../clinics/clinics.module';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { UserSchema } from '../auth/schemas/user.schema';
import {
  Patient,
  PatientSchema,
} from '../patients/schemas/patient.schema';

@Module({
  imports: [
    PatientsModule,
    ClinicsModule,
    ProfessionalsModule,
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: Patient.name, schema: PatientSchema },
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
