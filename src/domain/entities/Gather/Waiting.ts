// src/domain/entities/gather/Waiting.ts

export interface WaitingProps {
  user: string;
  phase: string;
  createdAt?: Date | null;
}

export class Waiting {
  public user: string;
  public phase: string;
  public createdAt: Date | null;

  constructor(props: WaitingProps) {
    this.user = props.user;
    this.phase = props.phase;
    this.createdAt = props.createdAt || null;
  }

  toPrimitives(): WaitingProps {
    return {
      user: this.user,
      phase: this.phase,
      createdAt: this.createdAt,
    };
  }
}
