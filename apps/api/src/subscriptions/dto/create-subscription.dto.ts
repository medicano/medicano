import { IsEnum, IsMongoId, IsOptional, IsDateString } from 'class-validator';
import { SubscriptionPlan } from '../constants/subscription.constants';

export class CreateSubscriptionDto {
  @IsMongoId()
  clinicId: string;

  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
