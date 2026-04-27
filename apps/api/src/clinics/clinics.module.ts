import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from '../auth/schemas/user.schema';
import { AttendantsController } from './controllers/attendants.controller';
import { ClinicsController } from './controllers/clinics.controller';
import { Clinic, ClinicSchema } from './schemas/clinic.schema';
import { AttendantsService } from './services/attendants.service';
import { ClinicsService } from './services/clinics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Clinic.name, schema: ClinicSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ClinicsController, AttendantsController],
  providers: [ClinicsService, AttendantsService],
  exports: [ClinicsService, MongooseModule],
})
export class ClinicsModule {}
