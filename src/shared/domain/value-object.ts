export abstract class ValueObject<TProps extends object> {
  protected readonly props: TProps;

  protected constructor(props: TProps) {
    this.props = Object.freeze(props);
  }

  equals(other?: ValueObject<TProps>): boolean {
    if (other == null || other == undefined) return false;
    if (other.props === undefined) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
