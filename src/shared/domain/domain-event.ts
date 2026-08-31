export abstract class DomainEvent {
  readonly occurredAt: Date;
  readonly aggregateId: string;

  protected constructor(aggregateId: string) {
    this.aggregateId = aggregateId;
    this.occurredAt = new Date();
  }

  abstract eventName(): string;
}
