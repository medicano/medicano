import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Professional, ProfessionalSchema } from '../professionals/schemas/professional.schema';
import { Clinic, ClinicSchema } from '../clinics/schemas/clinic.schema';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Professional.name, schema: ProfessionalSchema },
      { name: Clinic.name, schema: ClinicSchema },
    ]),
    SubscriptionsModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
