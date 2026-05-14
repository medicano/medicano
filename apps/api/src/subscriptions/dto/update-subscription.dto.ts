import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../constants/subscription.constants';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
