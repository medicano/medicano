import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../constants/subscription.constants';

// The web client sends the plan/status in uppercase (FREE/BASIC/PRO); the enums
// are lowercase. Normalize before validation so the enum check passes.
const toLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.toLowerCase() : value;

export class UpdateSubscriptionDto {
  @IsOptional()
  @Transform(toLower)
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @IsOptional()
  @Transform(toLower)
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
