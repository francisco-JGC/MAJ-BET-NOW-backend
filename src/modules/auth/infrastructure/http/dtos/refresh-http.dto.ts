import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshHttpDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
