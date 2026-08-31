import { Inject, Injectable } from '@nestjs/common';

import type { UseCase } from '../../../../shared/application/use-case';
import { NotFoundError } from '../../../../shared/domain/errors/domain.error';
import { UserRole } from '../../../users/domain/value-objects/user-role';
import {
  TICKETS_REPOSITORY,
  type TicketsRepository,
} from '../../domain/repositories/tickets.repository';
import { toTicketOutput, type TicketOutput } from '../dtos/ticket.output';

export interface FindTicketByFolioInput {
  folio: string;
  requesterId: string;
  requesterRole: UserRole;
}

@Injectable()
export class FindTicketByFolio implements UseCase<FindTicketByFolioInput, TicketOutput> {
  constructor(
    @Inject(TICKETS_REPOSITORY) private readonly tickets: TicketsRepository,
  ) {}

  async execute(input: FindTicketByFolioInput): Promise<TicketOutput> {
    const ticket = await this.tickets.findByFolio(input.folio);
    if (!ticket) throw new NotFoundError('Ticket', input.folio);

    if (
      input.requesterRole === UserRole.SELLER &&
      !ticket.isOwnedBy(input.requesterId)
    ) {
      throw new NotFoundError('Ticket', input.folio);
    }

    return toTicketOutput(ticket);
  }
}
