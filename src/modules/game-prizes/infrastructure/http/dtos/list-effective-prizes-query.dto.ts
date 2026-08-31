import { IsNotEmpty, IsUUID } from 'class-validator';

export class ListEffectivePrizesQueryDto {
  @IsNotEmpty()
  @IsUUID()
  salePointId!: string;
}
