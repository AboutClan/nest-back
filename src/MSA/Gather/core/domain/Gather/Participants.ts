// src/domain/entities/gather/Participants.ts

export interface ParticipantsProps {
  user?: string;
  phase: string;
  invited?: boolean;
  absence?: boolean;
  withCompanion?: boolean;
  isDummy?: boolean;
  dummyId?: string;
  dummyGender?: string;
  dummyBirth?: string;
}

export class Participants {
  public user?: string;
  public phase: string;
  public invited: boolean;
  public absence: boolean;
  public withCompanion: boolean;
  public isDummy: boolean;
  public dummyId?: string;
  public dummyGender?: string;
  public dummyBirth?: string;

  constructor(props: ParticipantsProps) {
    this.user = props.user;
    this.phase = props.phase ?? 'all';
    this.invited = props.invited ?? false;
    this.absence = props.absence ?? false;
    this.withCompanion = props.withCompanion ?? false;
    this.isDummy = props.isDummy ?? false;
    this.dummyId = props.dummyId;
    this.dummyGender = props.dummyGender;
    this.dummyBirth = props.dummyBirth;
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
      isDummy: this.isDummy,
      dummyId: this.dummyId,
      dummyGender: this.dummyGender,
      dummyBirth: this.dummyBirth,
    };
  }
}
