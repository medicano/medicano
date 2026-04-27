import { IsEnum, IsMongoId, IsOptional, IsIn, IsDateString } from 'class-validator';
import { SubscriptionPlan } from '../schemas/subscription.schema';

export class CreateSubscriptionDto {
  @IsIn(['clinic', 'professional'])
  ownerType: 'clinic' | 'professional';

  @IsMongoId()
  ownerId: string;

  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
