// src/domain/entities/realtime/RealtimeUser.ts

import { CommentProps, Comment } from './Comments';
import { Place, PlaceProps } from './Place';
import { Time, TimeProps } from './Time';

export type RealtimeUserStatus =
  | 'pending'
  | 'solo'
  | 'open'
  | 'free'
  | 'cancel';

export interface RealtimeUserProps {
  userId: string; // DB: user: ObjectId -> Domain: string
  place: PlaceProps;
  arrived?: Date;
  image?: string; // DB에는 Buffer or string이 들어갈 수 있으나 Domain에서는 string?
  memo?: string;
  comment?: CommentProps;
  status?: RealtimeUserStatus;
  time: TimeProps;
}

export class RealtimeUser {
  private userId: string;
  private place: Place;
  private arrived?: Date;
  private image?: string;
  private memo?: string;
  private comment?: Comment;
  private status: RealtimeUserStatus;
  private time: Time;

  constructor(props: RealtimeUserProps) {
    if (!props.userId) {
      throw new Error('RealtimeUser userId is required');
    }
    if (!props.place) {
      throw new Error('RealtimeUser place is required');
    }
    if (!props.time) {
      throw new Error('RealtimeUser time is required');
    }

    this.userId = props.userId;
    this.place = new Place(props.place);
    this.arrived = props.arrived;
    this.image = props.image;
    this.memo = props.memo;
    this.comment = props.comment ? new Comment(props.comment) : undefined;
    this.status = props.status ?? 'solo';
    this.time = new Time(props.time);
  }

  getUserId(): string {
    return this.userId;
  }

  getPlace(): Place {
    return this.place;
  }

  getArrived(): Date | undefined {
    return this.arrived;
  }

  getImage(): string | undefined {
    return this.image;
  }

  getMemo(): string | undefined {
    return this.memo;
  }

  getComment(): Comment | undefined {
    return this.comment;
  }

  getStatus(): RealtimeUserStatus {
    return this.status;
  }

  getTime(): Time {
    return this.time;
  }

  // 예: status 변경 로직
  updateStatus(newStatus: RealtimeUserStatus) {
    // 필요 시 검증
    this.status = newStatus;
  }

  toPrimitives(): RealtimeUserProps {
    return {
      userId: this.userId,
      place: this.place.toPrimitives(),
      arrived: this.arrived,
      image: this.image,
      memo: this.memo,
      comment: this.comment ? this.comment.toPrimitives() : undefined,
      status: this.status,
      time: this.time.toPrimitives(),
    };
  }
}
