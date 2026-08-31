import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ListGamesQueryDto {
  /// When true, only active games are returned. Default = false (include all).
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyActive: boolean = false;
}
