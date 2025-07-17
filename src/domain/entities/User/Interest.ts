export class Interest {
  constructor(
    public first?: string,
    public second?: string,
  ) {
    this.first = first || '';
    this.second = second || '';
  }

  toPrimitives() {
    return { first: this.first, second: this.second };
  }
}

export interface IInterest {
  first?: string;
  second?: string;
}
