export class Avatar {
  constructor(
    public type?: number,
    public bg?: number,
  ) {
    this.type = type;
    this.bg = bg;
  }

  toPrimitives() {
    return { type: this.type || null, bg: this.bg || null };
  }
}

export interface IAvatar {
  type?: number;
  bg?: number;
}
