import { Comment, CommentProps } from './Comment';
import { Place, PlaceProps } from './Place';
import { Time, TimeProps } from './Time';

/**
 * Status enum for RealtimeUser
 */
export type RealtimeUserStatus = 'solo' | 'open' | 'participation';

/**
 * Primitive props for RealtimeUser entity
 */
export interface RealtimeUserProps {
  user: string;
  location: PlaceProps;
  arrived?: Date;
  image?: string;
  memo?: string;
  comment?: CommentProps;
  status?: RealtimeUserStatus;
  time: TimeProps;
  absence?: boolean;
}

export class RealtimeUser {
  public readonly user: string;
  public location: Place;
  public arrived?: Date;
  public image?: string;
  public memo?: string;
  public comment?: Comment;
  public status: RealtimeUserStatus;
  public time: Time;
  public absence: boolean;

  constructor(props: RealtimeUserProps) {
    if (!props.user) throw new Error('RealtimeUser.userId is required');
    if (!props.location) throw new Error('RealtimeUser.place is required');
    if (!props.time) throw new Error('RealtimeUser.time is required');
    this.user = props.user;
    // instantiate nested entities from raw props
    this.location = new Place(
      props.location.latitude,
      props.location.longitude,
      props.location.name,
      props.location.address,
      props.location._id,
    );
    this.time = new Time(props.time.start, props.time.end);
    this.arrived = props.arrived;
    this.image = props.image;
    this.memo = props.memo;
    this.comment = props.comment ? new Comment(props.comment.text) : undefined;
    this.status = props.status ?? 'solo';
    this.absence = props.absence ?? false;
  }

  updateAbsence(userId: string, absence: boolean) {
    if (this.user === userId) this.absence = absence;
  }

  toPrimitives(): RealtimeUserProps {
    return {
      user: this.user,
      location: this.location.toPrimitives(),
      arrived: this.arrived,
      image: this.image,
      memo: this.memo,
      comment: this.comment?.toPrimitives(),
      status: this.status,
      time: this.time.toPrimitives(),
    };
  }
}
