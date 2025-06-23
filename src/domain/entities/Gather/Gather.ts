// src/domain/entities/gather/Gather.ts

import { Comment, CommentProps } from './Comment';
import { GatherList, GatherListProps } from './GatherList';
import { Location, LocationProps } from './Location';
import { MemberCnt, MemberCntProps } from './MemberCnt';
import { Participants, ParticipantsProps } from './Participants';
import { SubComment, SubCommentProps } from './SubComment';
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
  comments?: CommentProps[];
  id?: number;
  date?: string;
  waiting?: WaitingProps[];
  place?: string | null;
  isAdminOpen?: boolean | null;
  image?: string | null;
  coverImage?: string | null;
  kakaoUrl?: string | null;
  isApprovalRequired?: boolean | null;
  reviewers: string[];
  deposit: number;
  category?: string;
  groupId?: string | null;
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
  public comments: Comment[];
  public id: number;
  public date: string;
  public waiting: Waiting[];
  public place: string | null;
  public isAdminOpen: boolean | null;
  public image: string | null;
  public coverImage: string | null;
  public kakaoUrl: string | null;
  public isApprovalRequired: boolean | null;
  public reviewers: string[];
  public deposit: number;
  public category?: string;
  public groupId?: string | null;

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
    this.comments = props.comments?.map((c) => new Comment(c)) || [];
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

  public addComment(commentProps: CommentProps): void {
    this.comments.push(new Comment(commentProps));
  }

  public removeComment(commentId: string): void {
    this.comments = this.comments.filter(
      (c) => c._id.toString() !== commentId.toString(),
    );
  }

  public updateComment(commentId: string, content: string): void {
    this.comments.forEach((c) => {
      if (c._id.toString() === commentId.toString()) c.comment = content;
    });
  }

  public addCommentLike(commentId: string, writerId: string): void {
    this.comments.forEach((c) => {
      if (c._id === commentId) c.addLike(writerId);
    });
  }

  public addSubComment(
    commentId: string,
    subCommentProps: SubCommentProps,
  ): void {
    this.comments.forEach((c) => {
      if (c._id.toString() === commentId.toString())
        c.addSubComment(new SubComment(subCommentProps));
    });
  }

  public removeSubComment(commentId: string, subCommentId: string): void {
    this.comments.forEach((c) => {
      if (c._id.toString() === commentId.toString())
        c.removeSubComment(subCommentId);
    });
  }

  public updateSubComment(
    commentId: string,
    subCommentId: string,
    content: string,
  ): void {
    this.comments.forEach((c) => {
      if (c._id.toString() === commentId.toString())
        c.updateSubComment(subCommentId, content);
    });
  }

  public addSubCommentLike(
    commentId: string,
    subCommentId: string,
    writerId: string,
  ): void {
    this.comments.forEach((c) => {
      if (c._id.toString() === commentId.toString())
        c.addSubCommentLike(subCommentId, writerId);
    });
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
      comments: this.comments.map((c) => c.toPrimitives()),
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
    };
  }
}
