import { Entity } from './entity';
import { DomainEvent } from './domain-event';

export abstract class AggregateRoot<TProps> extends Entity<TProps> {
  private readonly _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }
}
