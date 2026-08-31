import { randomUUID } from 'crypto';

import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { ValidationError } from '../../../../shared/domain/errors/domain.error';

export interface DrawResultProps {
  gameId: string;
  drawAt: Date;
  winningNumber: string;
  recordedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDrawResultInput {
  gameId: string;
  drawAt: Date;
  winningNumber: string;
  recordedById: string;
}

export class DrawResult extends AggregateRoot<DrawResultProps> {
  private constructor(id: string, props: DrawResultProps) {
    super(id, props);
  }

  static create(input: CreateDrawResultInput): DrawResult {
    DrawResult.assertNonEmpty(input.winningNumber);
    const now = new Date();
    return new DrawResult(randomUUID(), {
      gameId: input.gameId,
      drawAt: input.drawAt,
      winningNumber: DrawResult.normalize(input.winningNumber),
      recordedById: input.recordedById,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(id: string, props: DrawResultProps): DrawResult {
    return new DrawResult(id, props);
  }

  get gameId(): string {
    return this.props.gameId;
  }

  get drawAt(): Date {
    return this.props.drawAt;
  }

  get winningNumber(): string {
    return this.props.winningNumber;
  }

  get recordedById(): string {
    return this.props.recordedById;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  changeWinningNumber(newNumber: string, recordedById: string): void {
    DrawResult.assertNonEmpty(newNumber);
    this.props.winningNumber = DrawResult.normalize(newNumber);
    this.props.recordedById = recordedById;
    this.props.updatedAt = new Date();
  }

  private static assertNonEmpty(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('winningNumber must not be empty');
    }
  }

  private static normalize(value: string): string {
    return value.trim();
  }
}
