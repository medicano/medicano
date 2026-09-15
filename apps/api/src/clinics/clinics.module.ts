import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Clinic, ClinicSchema } from './schemas/clinic.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { ClinicProfessional, ClinicProfessionalSchema } from '../professionals/schemas/clinic-professional.schema';
import { Professional, ProfessionalSchema } from '../professionals/schemas/professional.schema';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

import { ClinicsController } from './clinics.controller';
import { AttendantsController } from './controllers/attendants.controller';
import { ProfessionalAttendantsController } from './controllers/professional-attendants.controller';
import { ClinicUnitsController } from './controllers/clinic-units.controller';
import { ClinicPhotosController } from './controllers/clinic-photos.controller';
import { ClinicHealthInsurancesController } from './controllers/clinic-health-insurances.controller';

import { ClinicsService } from './clinics.service';
import { AttendantsService } from './services/attendants.service';
import { ClinicUnitsService } from './services/clinic-units.service';
import { ClinicPhotosService } from './services/clinic-photos.service';
import { ClinicHealthInsurancesService } from './services/clinic-health-insurances.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Clinic.name, schema: ClinicSchema },
      { name: User.name, schema: UserSchema },
      { name: ClinicProfessional.name, schema: ClinicProfessionalSchema },
      { name: Professional.name, schema: ProfessionalSchema },
    ]),
    SubscriptionsModule,
    ActivityLogModule,
  ],
  controllers: [
    ClinicsController,
    AttendantsController,
    ProfessionalAttendantsController,
    ClinicUnitsController,
    ClinicPhotosController,
    ClinicHealthInsurancesController,
  ],
  providers: [
    ClinicsService,
    AttendantsService,
    ClinicUnitsService,
    ClinicPhotosService,
    ClinicHealthInsurancesService,
  ],
  exports: [ClinicsService],
})
export class ClinicsModule {}
