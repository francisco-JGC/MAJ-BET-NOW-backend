import { IsBoolean } from 'class-validator';

export class ToggleSalePointHttpDto {
  @IsBoolean()
  active!: boolean;
}
