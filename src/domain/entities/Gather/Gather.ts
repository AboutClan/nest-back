// src/domain/entities/gather/Gather.ts

import { GatherList, GatherListProps } from './GatherList';
import { Location, LocationProps } from './Location';
import { MemberCnt, MemberCntProps } from './MemberCnt';
import { Participants, ParticipantsProps } from './Participants';
import { Title, TitleProps } from './Title';
import { Waiting, WaitingProps } from './Waiting';

export type GatherStatus = 'pending' | 'open' | 'close' | 'end';

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
  isApprovalRequired?: boolean | null;
  reviewers: string[];
  deposit: number;
  category?: string;
  groupId?: string | null;
  hasReview?: boolean;
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
  public isApprovalRequired: boolean | null;
  public reviewers: string[];
  public deposit: number;
  public category?: string;
  public groupId?: string | null;
  public hasReview?: boolean;

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
    this.isApprovalRequired = props.isApprovalRequired ?? null;
    this.reviewers = props.reviewers || [];
    this.deposit = props.deposit || 0;
    this.category = props.category || 'gather';
    this.groupId = props.groupId ?? null;
    this.postImage = props.postImage ?? null;
    this.hasReview = props.hasReview ?? false;
  }

  participate(participant: ParticipantsProps) {
    const isParticipate = this.participants.find(
      (p) => p.user.toString() === participant.user.toString(),
    );
    if (!isParticipate) {
      this.participants.push(new Participants(participant));
    }
  }

  exile(userId: string) {
    const index = this.participants.findIndex(
      (p) => p.user.toString() === userId.toString(),
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

  setAbsence(userId: string) {
    const index = this.participants.findIndex(
      (w) => w.user.toString() === userId.toString(),
    );
    if (index !== -1) {
      this.participants[index].absence = true;
    }
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

  toPrimitives(): GatherProps {
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
      isApprovalRequired: this.isApprovalRequired,
      reviewers: this.reviewers,
      deposit: this.deposit,
      category: this.category,
      groupId: this.groupId,
      hasReview: this.hasReview,
    };
  }
}
