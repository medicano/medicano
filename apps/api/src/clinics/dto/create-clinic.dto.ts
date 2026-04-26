import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SubscriptionStatus } from '../schemas/clinic.schema';

export class CreateClinicDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  subscriptionStatus?: SubscriptionStatus;
}
