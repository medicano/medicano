import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import {
  Professional,
  ProfessionalSchema,
} from '../professionals/schemas/professional.schema';
import {
  ClinicProfessional,
  ClinicProfessionalSchema,
} from '../professionals/schemas/clinic-professional.schema';
import {
  Subscription,
  SubscriptionSchema,
} from '../subscriptions/schemas/subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Professional.name, schema: ProfessionalSchema },
      { name: ClinicProfessional.name, schema: ClinicProfessionalSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
