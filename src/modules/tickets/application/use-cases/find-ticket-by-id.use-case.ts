import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
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

export interface FindTicketByIdInput {
  id: string;
  requesterId: string;
  requesterRole: UserRole;
}

@Injectable()
export class FindTicketById implements UseCase<FindTicketByIdInput, TicketOutput> {
  constructor(
    @Inject(TICKETS_REPOSITORY) private readonly tickets: TicketsRepository,
    @Inject(DRAW_RESULTS_REPOSITORY)
    private readonly drawResults: DrawResultsRepository,
  ) {}

  async execute(input: FindTicketByIdInput): Promise<TicketOutput> {
    const ticket = await this.tickets.findById(input.id);
    if (!ticket) throw new NotFoundError('Ticket', input.id);

    if (
      input.requesterRole === UserRole.SELLER &&
      !ticket.isOwnedBy(input.requesterId)
    ) {
      throw new NotFoundError('Ticket', input.id);
    }

    const executed = await this.drawResults.findByGameAndDraw(
      ticket.gameId,
      ticket.drawAt,
    );
    return toTicketOutput(ticket, executed !== null);
  }
}
