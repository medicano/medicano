import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserSchema } from '../auth/schemas/user.schema';
import { ClinicsController } from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { AttendantsController } from './controllers/attendants.controller';
import { Clinic, ClinicSchema } from './schemas/clinic.schema';
import { AttendantsService } from './services/attendants.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Clinic.name, schema: ClinicSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [ClinicsController, AttendantsController],
  providers: [ClinicsService, AttendantsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
