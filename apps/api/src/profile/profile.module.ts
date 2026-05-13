import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { UserSchema } from '../auth/schemas/user.schema';
import { Clinic, ClinicSchema } from '../clinics/schemas/clinic.schema';
import { Professional, ProfessionalSchema } from '../professionals/schemas/professional.schema';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: Clinic.name, schema: ClinicSchema },
      { name: Professional.name, schema: ProfessionalSchema },
      { name: Patient.name, schema: PatientSchema },
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
