// src/domain/entities/gather/Gather.ts

import { DateOption, DateOptionProps } from './DateOption';
import { GatherList, GatherListProps } from './GatherList';
import { Location, LocationProps } from './Location';
import { MemberCnt, MemberCntProps } from './MemberCnt';
import {
  GatherAbsenceType,
  Participants,
  ParticipantsProps,
} from './Participants';
import { Title, TitleProps } from './Title';
import { RegularFormApplicant } from './regularFormMatcher';
import { Waiting, WaitingProps } from './Waiting';

export type GatherStatus = 'pending' | 'open' | 'close' | 'end';

// 상시 행사(regularGather)의 일정. 매주 반복이면 weekday, 특정 날짜면 date.
// contentKey가 있으면 그 콘텐츠 전용 일정이다.
export interface RegularSlotProps {
  key: string;
  weekday?: number;
  date?: string;
  time: string;
  contentKey?: string;
}

// 상시 행사의 콘텐츠 라인업 (수시 교체)
export interface RegularContentProps {
  key: string;
  title: string;
  description?: string;
  url?: string;
  badge?: string;
  location?: LocationProps;
}

// 상시 행사 구글폼 신청 집계 (Apps Script가 갱신). byOption은 slot·content key별 선택 수.
// applicants는 이번 주 신청자(익명: 성별·출생연도·선택 key·제출 시각만, 이름·연락처 없음).
export interface FormStatsProps {
  roundKey: string;
  total: number;
  byOption: Record<string, number>;
  applicants: RegularFormApplicant[];
  updatedAt: Date;
}

export interface GatherProps {
  _id?: string;
  title?: string;
  type?: TitleProps;
  gatherList?: GatherListProps[];
  content?: string;
  location?: LocationProps;
  memberCnt?: MemberCntProps;
  age?: number[] | null;
  preCnt?: number | null;
  genderCondition?: boolean;
  password?: string | null;
  status?: GatherStatus;
  participants?: ParticipantsProps[];
  user?: string; // DB에선 user: ObjectId
  id?: number;
  date?: string;
  waiting?: WaitingProps[];
  place?: string | null;
  isAdminOpen?: boolean | null;
  image?: string | null;
  coverImage?: string | null;
  postImage?: string | null;
  kakaoUrl?: string | null;
  googleFormUrl?: string | null;
  isApprovalRequired?: boolean | null;
  reviewers: string[];
  deposit: number;
  category?: string;
  groupId?: string | null;
  hasReview?: boolean;
  dateOptions?: DateOptionProps[];
  slots?: RegularSlotProps[];
  contents?: RegularContentProps[];
  formStats?: FormStatsProps | null;
  parentGatherId?: number | null;
  // 상시 행사에서 앱 "신청하기"를 누른 기록(대기열과 별개). 폼 응답과 짝지어 회원을 연결하는 데만 쓴다.
  appApplies?: { user: string; createdAt: Date }[];
  // 상시 행사의 확정 모임을 연결할 소모임 id(GroupStudy.id). 있으면 확정 모임이 그 소모임 모임이 된다.
  confirmGroupId?: string | null;
  // 제휴 프로그램(partnerGather): 신청하기를 누르면 이동할 외부 URL과 할인 혜택 문구
  applyUrl?: string | null;
  benefit?: string | null;
  // 상시 행사 카드에 보일 기간 문구(예: '11~12월 진행'). 없으면 일정으로 자동 요약.
  scheduleLabel?: string | null;
}

export class Gather {
  public _id?: string;
  public title: string;
  public type: Title;
  public gatherList: GatherList[];
  public content: string;
  public location: Location;
  public memberCnt: MemberCnt;
  public age: number[] | null;
  public preCnt: number | null;
  public genderCondition: boolean;
  public password: string | null;
  public status: GatherStatus;
  public participants: Participants[];
  public user: string;
  public id: number;
  public date: string;
  public waiting: Waiting[];
  public place: string | null;
  public isAdminOpen: boolean | null;
  public image: string | null;
  public coverImage: string | null;
  public postImage: string | null;
  public kakaoUrl: string | null;
  public googleFormUrl: string | null;
  public isApprovalRequired: boolean | null;
  public reviewers: string[];
  public deposit: number;
  public category?: string;
  public groupId?: string | null;
  public hasReview?: boolean;
  public dateOptions: DateOption[];
  public slots: RegularSlotProps[];
  public contents: RegularContentProps[];
  public formStats: FormStatsProps | null;
  public parentGatherId: number | null;
  public appApplies: { user: string; createdAt: Date }[];
  public confirmGroupId: string | null;
  public applyUrl: string | null;
  public benefit: string | null;
  public scheduleLabel: string | null;

  constructor(props: GatherProps) {
    this._id = props._id ?? null;
    this.title = props.title;
    this.type = new Title(props.type);
    this.gatherList = props.gatherList.map((gl) => new GatherList(gl));
    this.content = props.content;
    this.location = new Location(props.location);
    this.memberCnt = new MemberCnt(props.memberCnt);
    this.age = props.age ?? null;
    this.preCnt = props.preCnt ?? null;
    this.genderCondition = props.genderCondition;
    this.password = props.password ?? null;
    this.status = props.status ?? 'pending';
    this.participants =
      props.participants?.map((p) => new Participants(p)) || [];
    this.user = props.user;
    this.id = props.id;
    this.date = props.date;
    this.waiting = props.waiting?.map((w) => new Waiting(w)) || [];
    this.place = props.place ?? null;
    this.isAdminOpen = props.isAdminOpen ?? null;
    this.image = props.image ?? null;
    this.coverImage = props.coverImage ?? null;
    this.kakaoUrl = props.kakaoUrl ?? null;
    this.googleFormUrl = props.googleFormUrl ?? null;
    this.isApprovalRequired = props.isApprovalRequired ?? null;
    this.reviewers = props.reviewers || [];
    this.deposit = props.deposit || 0;
    this.category = props.category || 'gather';
    this.groupId = props.groupId ?? null;
    this.postImage = props.postImage ?? null;
    this.hasReview = props.hasReview ?? false;
    this.dateOptions = (props.dateOptions ?? []).map((d) => new DateOption(d));
    this.slots = props.slots ?? [];
    this.contents = props.contents ?? [];
    this.formStats = props.formStats ?? null;
    this.parentGatherId = props.parentGatherId ?? null;
    this.appApplies = props.appApplies ?? [];
    this.confirmGroupId = props.confirmGroupId ?? null;
    this.applyUrl = props.applyUrl ?? null;
    this.benefit = props.benefit ?? null;
    this.scheduleLabel = props.scheduleLabel ?? null;
  }

  isRegularGather() {
    return this.category === 'regularGather';
  }

  isPartnerGather() {
    return this.category === 'partnerGather';
  }

  participate(participant: ParticipantsProps) {
    if (participant.isDummy) {
      this.participants.push(new Participants(participant));
      return;
    }
    const isParticipate = this.participants.find(
      (p) => !p.isDummy && p.user?.toString() === participant.user?.toString(),
    );
    if (!isParticipate) {
      this.participants.push(new Participants(participant));
    }
  }

  exile(userId: string) {
    const index = this.participants.findIndex(
      (p) =>
        (p.isDummy && p.dummyId === userId) ||
        (!p.isDummy && p.user?.toString() === userId.toString()),
    );
    if (index !== -1) {
      this.participants.splice(index, 1);
    }
  }

  setWaiting(waiting: WaitingProps) {
    const isWaiting = this.waiting.find(
      (w) => w.user.toString() === waiting.user.toString(),
    );
    if (!isWaiting) {
      this.waiting.push(new Waiting(waiting));
    }
  }

  removeWaiting(userId: string) {
    const index = this.waiting.findIndex(
      (w) => w.user.toString() === userId.toString(),
    );
    if (index !== -1) {
      this.waiting.splice(index, 1);
    }
  }

  /**
   * 참여자를 불참 처리한다. 이미 불참이거나 참여자가 아니면 false를 돌려
   * 호출부가 패널티를 중복으로 부과하지 않게 한다.
   * type이 없으면 유형 없이 불참만 표시한다(구버전 클라이언트 호환).
   */
  setAbsence(userId: string, type?: GatherAbsenceType): boolean {
    const participant = this.participants.find(
      (w) => w.user?.toString() === userId.toString(),
    );
    if (!participant || participant.absence) return false;

    participant.absence = true;
    participant.absenceType = type;
    return true;
  }

  openGather() {
    if (this.status === 'pending') {
      this.status = 'open';
    }
  }

  closeGather() {
    if (this.status === 'open') {
      this.status = 'close';
    }
  }

  endGather() {
    this.status = 'end';
  }

  public addReviewers(reviewer: string) {
    this.reviewers.push(reviewer);
  }

  // 참여자가 선택한 후보 날짜들로 내 투표 상태를 통째로 갱신 (복수 선택 가능)
  public voteDateOptions(userId: string, selectedDates: string[]) {
    for (const option of this.dateOptions) {
      const hasVoted = option.voters.some(
        (v) => v.toString() === userId.toString(),
      );
      const shouldVote = selectedDates.includes(option.date);

      if (shouldVote && !hasVoted) {
        option.voters.push(userId);
      } else if (!shouldVote && hasVoted) {
        option.voters = option.voters.filter(
          (v) => v.toString() !== userId.toString(),
        );
      }
    }
  }

  public toPrimitives(): GatherProps {
    return {
      _id: this._id,
      title: this.title,
      type: this.type.toPrimitives(),
      gatherList: this.gatherList.map((gl) => gl.toPrimitives()),
      content: this.content,
      location: this.location.toPrimitives(),
      memberCnt: this.memberCnt.toPrimitives(),
      age: this.age,
      preCnt: this.preCnt,
      genderCondition: this.genderCondition,
      password: this.password,
      status: this.status,
      participants: this.participants.map((p) => p.toPrimitives()),
      user: this.user,
      id: this.id,
      date: this.date,
      waiting: this.waiting.map((w) => w.toPrimitives()),
      place: this.place,
      isAdminOpen: this.isAdminOpen,
      image: this.image,
      coverImage: this.coverImage,
      kakaoUrl: this.kakaoUrl,
      googleFormUrl: this.googleFormUrl,
      isApprovalRequired: this.isApprovalRequired,
      reviewers: this.reviewers,
      deposit: this.deposit,
      category: this.category,
      groupId: this.groupId,
      hasReview: this.hasReview,
      dateOptions: this.dateOptions.map((d) => d.toPrimitives()),
      slots: this.slots,
      contents: this.contents,
      formStats: this.formStats,
      parentGatherId: this.parentGatherId,
    };
  }
}
