import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error';
import {
  DRAW_RESULTS_REPOSITORY,
  type DrawResultsRepository,
} from '../../../games/domain/repositories/draw-results.repository';
import { UserRole } from '../../../users/domain/value-objects/user-role';
import {
  TICKETS_REPOSITORY,
  type TicketsRepository,
} from '../../domain/repositories/tickets.repository';
import { toTicketOutput, type TicketOutput } from '../dtos/ticket.output';

export interface VoidTicketInput {
  id: string;
  /**
   * Motivo de la anulación — opcional. `null`/vacío se guarda como `null`
   * en `voided_reason`. La entidad `Ticket.void` normaliza al guardar.
   */
  reason: string | null;
  requesterId: string;
  requesterRole: UserRole;
}

@Injectable()
export class VoidTicket implements UseCase<VoidTicketInput, TicketOutput> {
  constructor(
    @Inject(TICKETS_REPOSITORY) private readonly tickets: TicketsRepository,
    @Inject(DRAW_RESULTS_REPOSITORY)
    private readonly drawResults: DrawResultsRepository,
  ) {}

  async execute(input: VoidTicketInput): Promise<TicketOutput> {
    const ticket = await this.tickets.findById(input.id);
    if (!ticket) throw new NotFoundError('Ticket', input.id);

    const isAdmin = input.requesterRole === UserRole.ADMIN;

    const executed = await this.drawResults.findByGameAndDraw(
      ticket.gameId,
      ticket.drawAt,
    );
    if (executed && !isAdmin) {
      throw new ValidationError(
        'El sorteo ya se corrió, el ticket no se puede anular',
      );
    }

    const now = new Date();
    const minutesUntilDraw = ticket.minutesUntilDraw(now);
    if (!isAdmin && minutesUntilDraw <= ticket.cutoffMinutes) {
      throw new ValidationError(
        `Ticket cannot be voided within ${ticket.cutoffMinutes} minutes of the draw`,
      );
    }

    if (input.requesterRole === UserRole.SELLER) {
      if (!ticket.isOwnedBy(input.requesterId)) {
        throw new NotFoundError('Ticket', input.id);
      }
    }

    ticket.void(input.reason);
    await this.tickets.save(ticket);
    return toTicketOutput(ticket);
  }
}
