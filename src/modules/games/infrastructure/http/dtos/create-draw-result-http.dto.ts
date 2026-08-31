import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDrawResultHttpDto {
  @IsString()
  @IsNotEmpty()
  gameId!: string;

  @IsDateString()
  drawAt!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Type(() => String)
  winningNumber!: string;
}
