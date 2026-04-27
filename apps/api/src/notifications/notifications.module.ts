import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { ProfessionalsModule } from '../professionals/professionals.module';

import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ProfessionalsModule,
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
