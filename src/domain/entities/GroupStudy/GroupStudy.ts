// src/domain/entities/groupStudy/GroupStudy.ts

import { Category, CategoryProps } from './Category';
import { Attendance, AttendanceProps } from './Attendance';
import { MemberCnt, MemberCntProps } from './MemberCnt';
import { Participants, ParticipantsProps } from './Participants';
import { Comment, CommentProps } from './Comment';
import { Waiting, WaitingProps } from './Waiting';

export type GroupStudyStatus =
  | 'end'
  | 'pending'
  | 'open'
  | 'close'
  | 'gathering'
  | 'study'
  | 'planned';

export type MeetingType = 'online' | 'offline' | 'hybrid';

export interface GroupStudyProps {
  title: string;
  category: CategoryProps;
  challenge?: string;
  rules: string[];
  content: string;
  period: string;
  guide: string;
  gender: boolean;
  age: number[];
  organizerId: string; // DB에선 organizer: ObjectId
  memberCnt: MemberCntProps;
  password?: string;
  status: GroupStudyStatus;
  participants: ParticipantsProps[];
  userId: string; // DB에선 user: ObjectId
  comments?: CommentProps[];
  id: number;
  location: string; // enum(LOCATION_LIST)
  image?: string;
  isFree: boolean;
  feeText?: string;
  fee?: number;
  questionText?: string;
  hashTag: string;
  attendance: AttendanceProps;
  link?: string;
  isSecret?: boolean;
  waiting?: WaitingProps[];
  squareImage?: string;
  meetingType?: MeetingType;
  requiredTicket: number;
}

export class GroupStudy {
  private title: string;
  private category: Category;
  private challenge?: string;
  private rules: string[];
  private content: string;
  private period: string;
  private guide: string;
  private gender: boolean;
  private age: number[];
  private organizerId: string;
  private memberCnt: MemberCnt;
  private password?: string;
  private status: GroupStudyStatus;
  private participants: Participants[];
  private userId: string;
  private comments: Comment[];
  private id: number;
  private location: string;
  private image?: string;
  private isFree: boolean;
  private feeText?: string;
  private fee?: number;
  private questionText?: string;
  private hashTag: string;
  private attendance: Attendance;
  private link?: string;
  private isSecret?: boolean;
  private waiting: Waiting[];
  private squareImage?: string;
  private meetingType?: MeetingType;
  private requiredTicket?: number;

  constructor(props: GroupStudyProps) {
    // if (!props.title) throw new Error('GroupStudy title is required.');
    // if (!props.content) throw new Error('GroupStudy content is required.');
    // if (!props.period) throw new Error('period is required');
    // if (!props.guide) throw new Error('guide is required');
    // if (!props.hashTag) throw new Error('hashTag is required');
    // if (!props.location) throw new Error('location is required');
    // if (!props.memberCnt) throw new Error('memberCnt is required');
    // if (!props.category) throw new Error('category is required');

    this.title = props.title;
    this.category = new Category(props.category);
    this.challenge = props.challenge;
    this.rules = props.rules ?? [];
    this.content = props.content;
    this.period = props.period;
    this.guide = props.guide;
    this.gender = props.gender;
    this.age = props.age ?? [];
    this.organizerId = props.organizerId;
    this.memberCnt = new MemberCnt(props.memberCnt);
    this.password = props.password;
    this.status = props.status ?? 'pending';
    this.participants = (props.participants ?? []).map(
      (p) => new Participants(p),
    );
    this.userId = props.userId;
    this.comments = (props.comments ?? []).map((c) => new Comment(c));
    this.id = props.id;
    this.location = props.location;
    this.image = props.image;
    this.isFree = props.isFree;
    this.feeText = props.feeText;
    this.fee = props.fee;
    this.questionText = props.questionText;
    this.hashTag = props.hashTag;
    this.attendance = new Attendance(props.attendance);
    this.link = props.link;
    this.isSecret = props.isSecret;
    this.waiting = (props.waiting ?? []).map((w) => new Waiting(w));
    this.squareImage = props.squareImage;
    this.meetingType = props.meetingType;
    this.requiredTicket = props.requiredTicket;
  }

  // 여기에 추가적인 비즈니스 로직 (ex: addParticipant, closeStudy 등) 가능
  // 예시
  addParticipant(participant: ParticipantsProps) {
    // 중복 체크 등 로직
    this.participants.push(new Participants(participant));
  }

  closeStudy() {
    if (this.status !== 'end') {
      this.status = 'end';
    }
  }

  // getters
  getTitle(): string {
    return this.title;
  }

  getCategory(): Category {
    return this.category;
  }

  getChallenge(): string | undefined {
    return this.challenge;
  }

  getRules(): string[] {
    return this.rules;
  }

  getContent(): string {
    return this.content;
  }

  getPeriod(): string {
    return this.period;
  }

  getGuide(): string {
    return this.guide;
  }

  isGenderRestricted(): boolean {
    return this.gender;
  }

  getAgeList(): number[] {
    return this.age;
  }

  getOrganizerId(): string {
    return this.organizerId;
  }

  getMemberCnt(): MemberCnt {
    return this.memberCnt;
  }

  getPassword(): string | undefined {
    return this.password;
  }

  getStatus(): GroupStudyStatus {
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

  getLocation(): string {
    return this.location;
  }

  getImage(): string | undefined {
    return this.image;
  }

  getIsFree(): boolean {
    return this.isFree;
  }

  getFeeText(): string | undefined {
    return this.feeText;
  }

  getFee(): number | undefined {
    return this.fee;
  }

  getQuestionText(): string | undefined {
    return this.questionText;
  }

  getHashTag(): string {
    return this.hashTag;
  }

  getAttendance(): Attendance {
    return this.attendance;
  }

  getLink(): string | undefined {
    return this.link;
  }

  getIsSecret(): boolean | undefined {
    return this.isSecret;
  }

  getWaiting(): Waiting[] {
    return this.waiting;
  }

  getSquareImage(): string | undefined {
    return this.squareImage;
  }

  getMeetingType(): MeetingType | undefined {
    return this.meetingType;
  }

  // toPrimitives
  toPrimitives(): GroupStudyProps {
    return {
      title: this.title,
      category: this.category.toPrimitives(),
      challenge: this.challenge,
      rules: [...this.rules],
      content: this.content,
      period: this.period,
      guide: this.guide,
      gender: this.gender,
      age: [...this.age],
      organizerId: this.organizerId,
      memberCnt: this.memberCnt.toPrimitives(),
      password: this.password,
      status: this.status,
      participants: this.participants.map((p) => p.toPrimitives()),
      userId: this.userId,
      comments: this.comments.map((c) => c.toPrimitives()),
      id: this.id,
      location: this.location,
      image: this.image,
      isFree: this.isFree,
      feeText: this.feeText,
      fee: this.fee,
      questionText: this.questionText,
      hashTag: this.hashTag,
      attendance: this.attendance.toPrimitives(),
      link: this.link,
      isSecret: this.isSecret,
      waiting: this.waiting.map((w) => w.toPrimitives()),
      squareImage: this.squareImage,
      meetingType: this.meetingType,
      requiredTicket: this.requiredTicket,
    };
  }
}
