// src/domain/entities/gather/Participants.ts

export interface ParticipantsProps {
  userId: string;
  phase: string;
  invited?: boolean;
}

export class Participants {
  private userId: string;
  private phase: string;
  private invited: boolean;

  constructor(props: ParticipantsProps) {
    this.userId = props.userId;
    this.phase = props.phase ?? 'all';
    this.invited = props.invited ?? false;
  }

  getUserId(): string {
    return this.userId;
  }
  getPhase(): string {
    return this.phase;
  }
  isInvited(): boolean {
    return this.invited;
  }

  toPrimitives(): ParticipantsProps {
    return {
      userId: this.userId,
      phase: this.phase,
      invited: this.invited,
    };
  }
}
