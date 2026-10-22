import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { ClinicsModule } from './clinics/clinics.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ClinicProfessionalsModule } from './professionals/clinic-professionals.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AvailabilityModule } from './availability/availability.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ProfileModule } from './profile/profile.module';
import { ChatModule } from './chat/chat.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RedisModule } from './redis/redis.module';
import { PatientProfileModule } from './patient-profile/patient-profile.module';
import { GeocodingModule } from './common/geocoding/geocoding.module';
import { CitiesModule } from './cities/cities.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientIpRequest, getClientIp } from './common/throttle/client-ip';
import { DEFAULT_THROTTLE, THROTTLE_ERROR_MESSAGE } from './common/throttle/throttle-limits';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ...DEFAULT_THROTTLE }],
      getTracker: (req) => getClientIp(req as ClientIpRequest),
      errorMessage: THROTTLE_ERROR_MESSAGE,
      // Os testes E2E fazem dezenas de logins seguidos do mesmo IP.
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    PatientsModule,
    ClinicsModule,
    ProfessionalsModule,
    ClinicProfessionalsModule,
    AppointmentsModule,
    AvailabilityModule,
    SubscriptionsModule,
    ProfileModule,
    ChatModule,
    SearchModule,
    NotificationsModule,
    RedisModule,
    PatientProfileModule,
    GeocodingModule,
    CitiesModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
