import { IsNotEmpty, IsString } from 'class-validator';

export class LoginHttpDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
