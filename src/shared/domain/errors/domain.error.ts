export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" was not found`);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
