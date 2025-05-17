// src/domain/entities/gather/Participants.ts

export interface ParticipantsProps {
  user: string;
  phase: string;
  invited?: boolean;
}

export class Participants {
  public user: string;
  public phase: string;
  public invited: boolean;

  constructor(props: ParticipantsProps) {
    this.user = props.user;
    this.phase = props.phase ?? 'all';
    this.invited = props.invited ?? false;
  }

  isInvited(): boolean {
    return this.invited;
  }

  toPrimitives(): ParticipantsProps {
    return {
      user: this.user,
      phase: this.phase,
      invited: this.invited,
    };
  }
}
