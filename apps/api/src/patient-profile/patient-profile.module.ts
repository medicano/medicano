import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientProfileController } from './patient-profile.controller';
import { PatientProfileService } from './patient-profile.service';
import {
  PatientProfile,
  PatientProfileSchema,
} from './schemas/patient-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PatientProfile.name, schema: PatientProfileSchema },
    ]),
  ],
  controllers: [PatientProfileController],
  providers: [PatientProfileService],
  exports: [PatientProfileService],
})
export class PatientProfileModule {}
