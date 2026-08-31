import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class BootstrapAdminHttpDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(60)
  username!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}
