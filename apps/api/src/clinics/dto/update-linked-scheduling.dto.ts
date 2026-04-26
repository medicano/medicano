import { IsBoolean } from 'class-validator';

export class UpdateLinkedSchedulingDto {
  @IsBoolean()
  linkedScheduling: boolean;
}
