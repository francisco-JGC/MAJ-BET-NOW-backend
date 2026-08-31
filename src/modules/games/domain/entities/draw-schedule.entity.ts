import { randomUUID } from 'crypto';

import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { ValidationError } from '../../../../shared/domain/errors/domain.error';

export interface DrawScheduleProps {
  gameId: string;
  dayOfWeek: number | null;
  drawTime: string;
  cutoffMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDrawScheduleInput {
  gameId: string;
  dayOfWeek: number | null;
  drawTime: string;
  cutoffMinutes?: number;
}

export interface UpdateDrawScheduleInput {
  dayOfWeek?: number | null;
  drawTime?: string;
  cutoffMinutes?: number;
  isActive?: boolean;
}

const DEFAULT_CUTOFF_MINUTES = 2;
const DRAW_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class DrawSchedule extends AggregateRoot<DrawScheduleProps> {
  private constructor(id: string, props: DrawScheduleProps) {
    super(id, props);
  }

  static create(input: CreateDrawScheduleInput): DrawSchedule {
    DrawSchedule.assertValidDayOfWeek(input.dayOfWeek);
    DrawSchedule.assertValidDrawTime(input.drawTime);
    const cutoff = input.cutoffMinutes ?? DEFAULT_CUTOFF_MINUTES;
    DrawSchedule.assertValidCutoff(cutoff);
    const now = new Date();
    return new DrawSchedule(randomUUID(), {
      gameId: input.gameId,
      dayOfWeek: input.dayOfWeek,
      drawTime: input.drawTime,
      cutoffMinutes: cutoff,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(id: string, props: DrawScheduleProps): DrawSchedule {
    return new DrawSchedule(id, props);
  }

  get gameId(): string {
    return this.props.gameId;
  }

  get dayOfWeek(): number | null {
    return this.props.dayOfWeek;
  }

  get drawTime(): string {
    return this.props.drawTime;
  }

  get cutoffMinutes(): number {
    return this.props.cutoffMinutes;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  update(input: UpdateDrawScheduleInput): void {
    if (input.dayOfWeek !== undefined) {
      DrawSchedule.assertValidDayOfWeek(input.dayOfWeek);
      this.props.dayOfWeek = input.dayOfWeek;
    }
    if (input.drawTime !== undefined) {
      DrawSchedule.assertValidDrawTime(input.drawTime);
      this.props.drawTime = input.drawTime;
    }
    if (input.cutoffMinutes !== undefined) {
      DrawSchedule.assertValidCutoff(input.cutoffMinutes);
      this.props.cutoffMinutes = input.cutoffMinutes;
    }
    if (input.isActive !== undefined) this.props.isActive = input.isActive;
    this.props.updatedAt = new Date();
  }

  appliesTo(dayOfWeek: number): boolean {
    if (!this.props.isActive) return false;
    return this.props.dayOfWeek === null || this.props.dayOfWeek === dayOfWeek;
  }

  toMinutes(): number {
    const [h, m] = this.props.drawTime.split(':').map(Number);
    return h * 60 + m;
  }

  private static assertValidDayOfWeek(day: number | null): void {
    if (day === null) return;
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      throw new ValidationError('dayOfWeek must be 0-6 or null');
    }
  }

  private static assertValidDrawTime(time: string): void {
    if (!DRAW_TIME_PATTERN.test(time)) {
      throw new ValidationError('drawTime must be in HH:mm 24h format');
    }
  }

  private static assertValidCutoff(cutoff: number): void {
    if (!Number.isInteger(cutoff) || cutoff < 0 || cutoff > 720) {
      throw new ValidationError('cutoffMinutes must be between 0 and 720');
    }
  }
}
