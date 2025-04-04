// src/domain/entities/Avatar.ts

export interface AvatarProps {
  type: number;
  bg: number;
}

export class Avatar {
  private type: number;
  private bg: number;

  constructor(props: AvatarProps) {
    this.type = props.type ?? 1;
    this.bg = props.bg ?? 1;
  }

  getType(): number {
    return this.type;
  }
  getBg(): number {
    return this.bg;
  }

  toPrimitives(): AvatarProps {
    return {
      type: this.type,
      bg: this.bg,
    };
  }
}
