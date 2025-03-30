// src/domain/entities/gather/Waiting.ts

export interface WaitingProps {
  userId: string;
  phase: string;
}

export class Waiting {
  private userId: string;
  private phase: string;

  constructor(props: WaitingProps) {
    if (!props.userId) {
      throw new Error('Waiting userId is required');
    }
    this.userId = props.userId;
    this.phase = props.phase;
  }

  getUserId(): string {
    return this.userId;
  }
  getPhase(): string {
    return this.phase;
  }

  toPrimitives(): WaitingProps {
    return {
      userId: this.userId,
      phase: this.phase,
    };
  }
}
