import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import configuration from './config/configuration';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClinicsModule } from './clinics/clinics.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ClinicProfessionalsModule } from './professionals/clinic-professionals.module';

// Newly wired (sprints 03–10)
import { AppointmentsModule } from './appointments/appointments.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ChatModule } from './chat/chat.module';
import { SearchModule } from './search/search.module';
import { AvailabilityModule } from './availability/availability.module';
import { PatientsModule } from './patients/patients.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('database.uri'),
      }),
    }),
    RedisModule,
    AuthModule,
    UsersModule,
    ClinicsModule,
    ProfessionalsModule,
    ClinicProfessionalsModule,
    AppointmentsModule,
    SubscriptionsModule,
    ChatModule,
    SearchModule,
    AvailabilityModule,
    PatientsModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
