import { IsBoolean } from 'class-validator';

export class ToggleGameHttpDto {
  @IsBoolean()
  active!: boolean;
}
