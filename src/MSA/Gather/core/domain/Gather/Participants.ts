// src/domain/entities/gather/Participants.ts

export interface ParticipantsProps {
  user: string;
  phase: string;
  invited?: boolean;
  absence?: boolean;
  withCompanion?: boolean;
}

export class Participants {
  public user: string;
  public phase: string;
  public invited: boolean;
  public absence: boolean;
  public withCompanion: boolean;

  constructor(props: ParticipantsProps) {
    this.user = props.user;
    this.phase = props.phase ?? 'all';
    this.invited = props.invited ?? false;
    this.absence = props.absence ?? false;
    this.withCompanion = props.withCompanion ?? false;
  }

  isInvited(): boolean {
    console.log('test');
    return this.invited;
  }

  toPrimitives(): ParticipantsProps {
    return {
      user: this.user,
      phase: this.phase,
      invited: this.invited,
      absence: this.absence,
      withCompanion: this.withCompanion,
    };
  }
}
