import {
  IsDateString,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSubscriptionDto {
  @IsIn(['clinic', 'professional'])
  ownerType: 'clinic' | 'professional';

  @IsMongoId()
  ownerId: string;

  /**
   * @deprecated Use ownerType='clinic' and ownerId instead.
   */
  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @IsString()
  @IsNotEmpty()
  plan: string;

  @IsDateString()
  expiresAt: string;
}
