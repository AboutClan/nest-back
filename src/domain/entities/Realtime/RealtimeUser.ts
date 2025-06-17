import { Place, PlaceProps } from './Place';
import { Time, TimeProps } from './Time';
import { Comment, CommentProps } from './Comment';

/**
 * Status enum for RealtimeUser
 */
export type RealtimeUserStatus =
  | 'pending'
  | 'solo'
  | 'open'
  | 'free'
  | 'cancel';

/**
 * Primitive props for RealtimeUser entity
 */
export interface RealtimeUserProps {
  userId: string;
  place: PlaceProps;
  arrived?: Date;
  image?: string;
  memo?: string;
  comment?: CommentProps;
  status?: RealtimeUserStatus;
  time: TimeProps;
}

export class RealtimeUser {
  public readonly userId: string;
  public place: Place;
  public arrived?: Date;
  public image?: string;
  public memo?: string;
  public comment?: Comment;
  public status: RealtimeUserStatus;
  public time: Time;

  constructor(props: RealtimeUserProps) {
    if (!props.userId) throw new Error('RealtimeUser.userId is required');
    if (!props.place) throw new Error('RealtimeUser.place is required');
    if (!props.time) throw new Error('RealtimeUser.time is required');
    this.userId = props.userId;
    // instantiate nested entities from raw props
    this.place = new Place(
      props.place.latitude,
      props.place.longitude,
      props.place.name,
      props.place.address,
    );
    this.time = new Time(props.time.start, props.time.end);
    this.arrived = props.arrived;
    this.image = props.image;
    this.memo = props.memo;
    this.comment = props.comment ? new Comment(props.comment.text) : undefined;
    this.status = props.status ?? 'solo';
  }

  toPrimitives(): RealtimeUserProps {
    return {
      userId: this.userId,
      place: this.place.toPrimitives(),
      arrived: this.arrived,
      image: this.image,
      memo: this.memo,
      comment: this.comment?.toPrimitives(),
      status: this.status,
      time: this.time.toPrimitives(),
    };
  }
}
