import { VoteComment, VoteCommentProps } from './Vote2VoteComment';

export interface MemberProps {
  userId: string;
  arrived?: Date;
  memo?: string;
  img?: string;
  start?: string;
  end?: string;
  absence?: boolean;
  comment?: string;
}

export class Member {
  userId: string;
  arrived?: Date;
  memo?: string;
  img?: string;
  start?: string;
  end?: string;
  absence?: boolean;
  comment?: string;

  constructor(props: MemberProps) {
    this.userId = props.userId;
    this.arrived = props.arrived;
    this.memo = props.memo;
    this.img = props.img;
    this.start = props.start;
    this.end = props.end;
    this.absence = props.absence;
    this.comment = props.comment ? props.comment : undefined;
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
      comment: this.comment ? this.comment : undefined,
    };
  }
}
