// src/domain/entities/gather/Participants.ts

/**
 * 모임장이 불참 인원을 체크할 때 고르는 유형. 유형마다 차감 포인트가 다르다.
 * - normal: 모임 1~2일 전에 불참을 알림
 * - noshow: 모임 당일 불참
 * - nomanner: 연락 없이 당일 불참
 */
export const GATHER_ABSENCE_TYPES = ['normal', 'noshow', 'nomanner'] as const;
export type GatherAbsenceType = (typeof GATHER_ABSENCE_TYPES)[number];

export interface ParticipantsProps {
  user?: string;
  phase: string;
  invited?: boolean;
  absence?: boolean;
  absenceType?: GatherAbsenceType;
  withCompanion?: boolean;
  isDummy?: boolean;
  dummyId?: string;
  dummyName?: string;
  dummyGender?: string;
  dummyBirth?: string;
}

export class Participants {
  public user?: string;
  public phase: string;
  public invited: boolean;
  public absence: boolean;
  public absenceType?: GatherAbsenceType;
  public withCompanion: boolean;
  public isDummy: boolean;
  public dummyId?: string;
  public dummyName?: string;
  public dummyGender?: string;
  public dummyBirth?: string;

  constructor(props: ParticipantsProps) {
    this.user = props.user;
    this.phase = props.phase ?? 'all';
    this.invited = props.invited ?? false;
    this.absence = props.absence ?? false;
    this.absenceType = props.absenceType;
    this.withCompanion = props.withCompanion ?? false;
    this.isDummy = props.isDummy ?? false;
    this.dummyId = props.dummyId;
    this.dummyName = props.dummyName;
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
      absenceType: this.absenceType,
      withCompanion: this.withCompanion,
      isDummy: this.isDummy,
      dummyId: this.dummyId,
      dummyName: this.dummyName,
      dummyGender: this.dummyGender,
      dummyBirth: this.dummyBirth,
    };
  }
}
