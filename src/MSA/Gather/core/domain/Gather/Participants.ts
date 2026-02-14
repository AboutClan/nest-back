// src/domain/entities/gather/Participants.ts

export interface ParticipantsProps {
  user: string;
  phase: string;
  invited?: boolean;
  absence?: boolean;
}

export class Participants {
  public user: string;
  public phase: string;
  public invited: boolean;
  public absence: boolean;

  constructor(props: ParticipantsProps) {
    this.user = props.user;
    this.phase = props.phase ?? 'all';
    this.invited = props.invited ?? false;
    this.absence = props.absence ?? false;
  }

  isInvited(): boolean {
    return this.invited;
  }

  toPrimitives(): ParticipantsProps {
    return {
      user: this.user,
      phase: this.phase,
      invited: this.invited,
      absence: this.absence,
    };
  }
}
