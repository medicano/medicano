import { IsIn, IsMongoId, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsIn(['clinic', 'professional'])
  @IsNotEmpty()
  ownerType: 'clinic' | 'professional';

  @IsMongoId()
  @IsNotEmpty()
  ownerId: string;

  /**
   * @deprecated Use `ownerId` + `ownerType` instead.
   * Kept for backward compatibility during transition. Will be removed in a future sprint.
   */
  @IsMongoId()
  @IsOptional()
  clinicId?: string;

  @IsNotEmpty()
  plan: string;

  @IsDateString()
  @IsNotEmpty()
  expiresAt: Date;
}
