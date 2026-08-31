import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateDrawScheduleHttpDto {
  @ValidateIf((o: CreateDrawScheduleHttpDto) => o.dayOfWeek !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number | null;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'drawTime must be in HH:mm 24h format',
  })
  drawTime!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  cutoffMinutes?: number;
}
