export abstract class Entity<TProps> {
  protected readonly _id: string;
  protected readonly props: TProps;

  protected constructor(id: string, props: TProps) {
    this._id = id;
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  equals(other?: Entity<TProps>): boolean {
    if (other == null || other == undefined) return false;
    if (this === other) return true;
    return this._id === other._id;
  }
}
