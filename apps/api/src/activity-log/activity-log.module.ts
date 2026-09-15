import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Clinic, ClinicSchema } from '../clinics/schemas/clinic.schema';
import { Professional, ProfessionalSchema } from '../professionals/schemas/professional.schema';

import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogService } from './activity-log.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: Clinic.name, schema: ClinicSchema },
      { name: Professional.name, schema: ProfessionalSchema },
    ]),
  ],
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
