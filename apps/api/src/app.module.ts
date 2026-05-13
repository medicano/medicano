import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
  ],
})
export class AppModule {}
