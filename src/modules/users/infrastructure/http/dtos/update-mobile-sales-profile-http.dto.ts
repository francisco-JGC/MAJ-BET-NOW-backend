import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateMobileSalesProfileHttpDto {
  @IsBoolean()
  mobileSalesEnabled!: boolean;

  /**
   * Sucursal donde el admin va a vender. Requerida si `enabled=true`;
   * la validación business-level la hace el use-case.
   */
  @IsOptional()
  @IsUUID()
  defaultSalePointId?: string | null;
}
