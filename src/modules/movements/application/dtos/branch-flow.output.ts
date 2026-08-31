import type { MovementType } from '../../domain/value-objects/movement-type';

export type BranchFlowKind = 'ticket_sale' | 'prize_payout' | 'movement';

/**
 * One event in the chronological flow of a sucursal. `amount` is always
 * non-negative; whether it adds or subtracts is decided by `kind` (and by
 * the movement's `type` when `kind='movement'`).
 */
export interface BranchFlowItem {
  kind: BranchFlowKind;
  /** When it happened, in UTC. */
  at: Date;
  amount: number;
  /** Ticket folio for ticket_sale / prize_payout; null for movements. */
  folio: string | null;
  /** Present only when `kind='movement'`. */
  movementType: MovementType | null;
  description: string;
  /** Original row id — used for keys and future drill-downs. */
  refId: string;
}

export interface BranchFlowOutput {
  items: BranchFlowItem[];
}
