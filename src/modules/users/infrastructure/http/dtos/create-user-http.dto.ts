import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { UserRole } from '../../../domain/value-objects/user-role';

export class CreateUserHttpDto {
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

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nationalId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  paymentPercentage?: number;

  @IsOptional()
  @IsUUID()
  salePointId?: string;
}
