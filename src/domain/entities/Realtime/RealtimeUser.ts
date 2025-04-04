export type RealtimeStatus = 'pending' | 'solo' | 'open' | 'free' | 'cancel';

export interface CommentProps {
  text: string;
}

export interface TimeProps {
  start: string; // ISO Date String
  end: string; // ISO Date String
}

export interface RealtimeUserProps {
  userId: string; // Mongoose ObjectId => string in domain
  place: PlaceProps; // nested Place
  arrived?: Date;
  image?: string;
  memo?: string;
  comment?: CommentProps;
  status: RealtimeStatus;
  time: TimeProps;
}

export class RealtimeUser {
  private userId: string;
  private place: Place;
  private arrived?: Date;
  private image?: string;
  private memo?: string;
  private comment?: CommentProps;
  private status: RealtimeStatus;
  private time: TimeProps;

  constructor(props: RealtimeUserProps) {
    if (!props.userId) {
      throw new Error('userId is required');
    }
    if (!props.place) {
      throw new Error('place is required');
    }
    if (!props.status) {
      throw new Error('status is required');
    }
    if (!props.time) {
      throw new Error('time is required');
    }

    this.userId = props.userId;
    this.place = new Place(props.place);
    this.arrived = props.arrived;
    this.image = props.image;
    this.memo = props.memo;
    this.comment = props.comment;
    this.status = props.status;
    this.time = props.time;
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
  getComment(): CommentProps | undefined {
    return this.comment;
  }
  getStatus(): RealtimeStatus {
    return this.status;
  }
  getTime(): TimeProps {
    return this.time;
  }

  toPrimitives(): RealtimeUserProps {
    return {
      userId: this.userId,
      place: this.place.toPrimitives(),
      arrived: this.arrived,
      image: this.image,
      memo: this.memo,
      comment: this.comment,
      status: this.status,
      time: this.time,
    };
  }
}
