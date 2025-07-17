export class Avatar {
  constructor(
    public type?: number,
    public bg?: number,
  ) {
    this.type = type ?? 0;
    this.bg = bg ?? 0;
  }

  toPrimitives() {
    return { type: this.type, bg: this.bg };
  }
}

export interface IAvatar {
  type?: number;
  bg?: number;
}
