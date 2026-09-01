import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error';
import {
  SALE_POINTS_REPOSITORY,
  type SalePointsRepository,
} from '../../../sale-points/domain/repositories/sale-points.repository';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../domain/repositories/users.repository';
import { UserRole } from '../../domain/value-objects/user-role';
import { toUserOutput, type UserOutput } from '../dtos/user.output';

export interface UpdateMobileSalesProfileInput {
  /** El id del user que edita SU propio perfil. */
  requesterId: string;
  requesterRole: UserRole;
  /** Nuevo estado del flag. Si viene `false`, se ignora `defaultSalePointId`. */
  mobileSalesEnabled: boolean;
  /** Sucursal donde el admin va a vender. Requerida si `enabled=true`. */
  defaultSalePointId: string | null;
}

/**
 * Endpoint del "Modo vendedor" del perfil. Solo relevante para admins —
 * es la forma que tiene un admin de darse acceso a la app móvil sin
 * cambiar su rol (sigue siendo admin, no se convierte en seller).
 *
 * Reglas de negocio:
 *  - Solo admins pueden invocar. Sellers y partners no lo necesitan
 *    (los sellers ya tienen `salePointId` estructural; los partners
 *    no venden desde la app).
 *  - Activar el modo requiere elegir una sucursal ACTIVA. Sin eso, el
 *    `CreateTicket` no tendría a qué imputar las ventas.
 *  - Desactivar el modo NO limpia el `defaultSalePointId` — el admin
 *    puede querer volver a activarlo mañana con la misma sucursal.
 */
@Injectable()
export class UpdateMobileSalesProfile
  implements UseCase<UpdateMobileSalesProfileInput, UserOutput>
{
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(SALE_POINTS_REPOSITORY)
    private readonly salePoints: SalePointsRepository,
  ) {}

  async execute(
    input: UpdateMobileSalesProfileInput,
  ): Promise<UserOutput> {
    if (input.requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo los administradores pueden configurar el modo vendedor',
      );
    }

    const user = await this.users.findById(input.requesterId);
    if (!user) throw new NotFoundError('User', input.requesterId);

    if (input.mobileSalesEnabled) {
      if (!input.defaultSalePointId) {
        throw new ValidationError(
          'Debes elegir una sucursal para activar el modo vendedor',
        );
      }
      const salePoint = await this.salePoints.findById(
        input.defaultSalePointId,
      );
      if (!salePoint) {
        throw new NotFoundError('SalePoint', input.defaultSalePointId);
      }
      if (!salePoint.isActive) {
        throw new ValidationError(
          'Esa sucursal está desactivada, no puedes vender desde ahí',
        );
      }
      user.update({
        mobileSalesEnabled: true,
        defaultSalePointId: input.defaultSalePointId,
      });
    } else {
      // Al apagar el flag NO limpiamos `defaultSalePointId` — el admin
      // puede haberlo elegido y querer volver a activarlo después con
      // la misma. Si un día quiere cambiar de sucursal, lo hace en el
      // mismo update poniendo enabled=true + nueva sucursal.
      user.update({ mobileSalesEnabled: false });
    }

    await this.users.save(user);
    return toUserOutput(user);
  }
}
