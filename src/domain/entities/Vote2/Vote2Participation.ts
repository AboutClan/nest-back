import { VoteComment, VoteCommentProps } from './Vote2VoteComment';

export interface ParticipationProps {
  userId: string;
  latitude: string;
  longitude: string;
  start?: string;
  end?: string;
  comment?: VoteCommentProps;
  locationDetail?: string;
}

export class Participation {
  userId: string;
  latitude: string;
  longitude: string;
  start?: string;
  end?: string;
  comment?: VoteComment;
  locationDetail: string;

  constructor(props: ParticipationProps) {
    this.userId = props.userId;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
    this.start = props.start;
    this.end = props.end;
    this.comment = props.comment ? new VoteComment(props.comment) : undefined;
    this.locationDetail = props.locationDetail;
  }
  toPrimitives(): ParticipationProps {
    console.log(24, this.locationDetail);
    return {
      userId: this.userId,
      latitude: this.latitude,
      longitude: this.longitude,
      start: this.start,
      end: this.end,
      comment: this.comment ? this.comment.toPrimitives() : undefined,
      locationDetail: this.locationDetail,
    };
  }
}
