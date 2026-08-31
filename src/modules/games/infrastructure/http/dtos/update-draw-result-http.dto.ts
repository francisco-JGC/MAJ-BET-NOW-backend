import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateDrawResultHttpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  winningNumber!: string;
}
