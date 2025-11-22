import { VoteComment, VoteCommentProps } from './Vote2VoteComment';

export interface MemberProps {
  userId: string;
  arrived?: Date;
  memo?: string;
  img?: string;
  start?: string;
  end?: string;
  absence?: boolean;
  comment?: VoteCommentProps;
  isBeforeResult?: boolean;
  imageUrl?: string;
}

export class Member {
  userId: string;
  arrived?: Date;
  memo?: string;
  img?: string;
  start?: string;
  end?: string;
  absence?: boolean;
  comment?: VoteComment;
  isBeforeResult?: boolean;
  imageUrl?: string;

  constructor(props: MemberProps) {
    this.userId = props.userId;
    this.arrived = props.arrived;
    this.memo = props.memo;
    this.img = props.img;
    this.start = props.start;
    this.end = props.end;
    this.absence = props.absence;
    this.comment = props.comment ? new VoteComment(props.comment) : undefined;
    this.isBeforeResult = props.isBeforeResult;
    this.imageUrl = props.imageUrl;
  }

  toPrimitives(): MemberProps {
    return {
      userId: this.userId,
      arrived: this.arrived,
      memo: this.memo,
      img: this.img,
      start: this.start,
      end: this.end,
      absence: this.absence,
      comment: this.comment ? this.comment.toPrimitives() : undefined,
      isBeforeResult: this.isBeforeResult,
      imageUrl: this.imageUrl,
    };
  }
}
