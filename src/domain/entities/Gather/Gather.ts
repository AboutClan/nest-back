// src/domain/entities/gather/Gather.ts

import { Title, TitleProps } from './Title';
import { GatherList, GatherListProps } from './GatherList';
import { Location, LocationProps } from './Location';
import { MemberCnt, MemberCntProps } from './MemberCnt';
import { Participants, ParticipantsProps } from './Participants';
import { Comment, CommentProps } from './Comment';
import { Waiting, WaitingProps } from './Waiting';

export type GatherStatus = 'pending' | 'open' | 'close' | 'end';

export interface GatherProps {
  title: string;
  type: TitleProps;
  gatherList: GatherListProps[];
  content: string;
  location: LocationProps;
  memberCnt: MemberCntProps;
  age?: number[] | null;
  preCnt?: number | null;
  genderCondition: boolean;
  password?: string | null;
  status?: GatherStatus;
  participants: ParticipantsProps[];
  userId: string; // DB에선 user: ObjectId
  comments: CommentProps[];
  id: number;
  date: string;
  waiting: WaitingProps[];
  place?: string | null;
  isAdminOpen?: boolean | null;
  image?: string | null;
  kakaoUrl?: string | null;
  isApprovalRequired?: boolean | null;
}

export class Gather {
  private title: string;
  private type: Title;
  private gatherList: GatherList[];
  private content: string;
  private location: Location;
  private memberCnt: MemberCnt;
  private age: number[] | null;
  private preCnt: number | null;
  private genderCondition: boolean;
  private password: string | null;
  private status: GatherStatus;
  private participants: Participants[];
  private userId: string;
  private comments: Comment[];
  private id: number;
  private date: string;
  private waiting: Waiting[];
  private place: string | null;
  private isAdminOpen: boolean | null;
  private image: string | null;
  private kakaoUrl: string | null;
  private isApprovalRequired: boolean | null;

  constructor(props: GatherProps) {
    if (!props.title) throw new Error('Gather title is required');
    if (!props.content) throw new Error('Gather content is required');
    if (!props.userId) throw new Error('Gather userId is required');
    if (!props.type) throw new Error('type is required');
    if (!props.gatherList) throw new Error('gatherList is required');
    if (!props.location) throw new Error('location is required');
    if (!props.memberCnt) throw new Error('memberCnt is required');

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
    this.participants = props.participants.map((p) => new Participants(p));
    this.userId = props.userId;
    this.comments = props.comments.map((c) => new Comment(c));
    this.id = props.id;
    this.date = props.date;
    this.waiting = props.waiting.map((w) => new Waiting(w));
    this.place = props.place ?? null;
    this.isAdminOpen = props.isAdminOpen ?? null;
    this.image = props.image ?? null;
    this.kakaoUrl = props.kakaoUrl ?? null;
    this.isApprovalRequired = props.isApprovalRequired ?? null;
  }

  // getters
  getTitle(): string {
    return this.title;
  }
  getType(): Title {
    return this.type;
  }
  getGatherList(): GatherList[] {
    return this.gatherList;
  }
  getContent(): string {
    return this.content;
  }
  getLocation(): Location {
    return this.location;
  }
  getMemberCnt(): MemberCnt {
    return this.memberCnt;
  }
  getAge(): number[] | null {
    return this.age;
  }
  getPreCnt(): number | null {
    return this.preCnt;
  }
  getGenderCondition(): boolean {
    return this.genderCondition;
  }
  getPassword(): string | null {
    return this.password;
  }
  getStatus(): GatherStatus {
    return this.status;
  }
  getParticipants(): Participants[] {
    return this.participants;
  }
  getUserId(): string {
    return this.userId;
  }
  getComments(): Comment[] {
    return this.comments;
  }
  getId(): number {
    return this.id;
  }
  getDate(): string {
    return this.date;
  }
  getWaiting(): Waiting[] {
    return this.waiting;
  }
  getPlace(): string | null {
    return this.place;
  }
  getIsAdminOpen(): boolean | null {
    return this.isAdminOpen;
  }
  getImage(): string | null {
    return this.image;
  }
  getKakaoUrl(): string | null {
    return this.kakaoUrl;
  }
  getIsApprovalRequired(): boolean | null {
    return this.isApprovalRequired;
  }

  // 예: 상태 변경 로직
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

  // 좋아요/대댓글 등 다른 도메인 로직이 필요하다면 메서드 추가

  // toPrimitives: Domain Entity -> DTO
  toPrimitives(): GatherProps {
    return {
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
      userId: this.userId,
      comments: this.comments.map((c) => c.toPrimitives()),
      id: this.id,
      date: this.date,
      waiting: this.waiting.map((w) => w.toPrimitives()),
      place: this.place,
      isAdminOpen: this.isAdminOpen,
      image: this.image,
      kakaoUrl: this.kakaoUrl,
      isApprovalRequired: this.isApprovalRequired,
    };
  }
}
