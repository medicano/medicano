import { IsEnum, IsNotEmpty, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionPlan } from '../constants/subscription.constants';

export class CreateSubscriptionDto {
  @IsEnum(SubscriptionPlan)
  @IsNotEmpty()
  plan: SubscriptionPlan;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;
}
