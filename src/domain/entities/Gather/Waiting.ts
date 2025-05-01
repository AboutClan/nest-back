// src/domain/entities/gather/Waiting.ts

export interface WaitingProps {
  user: string;
  phase: string;
}

export class Waiting {
  public user: string;
  public phase: string;

  constructor(props: WaitingProps) {
    this.user = props.user;
    this.phase = props.phase;
  }

  toPrimitives(): WaitingProps {
    return {
      user: this.user,
      phase: this.phase,
    };
  }
}
