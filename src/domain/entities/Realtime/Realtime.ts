import { IUser } from '../User/User';
import { Comment } from './Comment';
import { RealtimeUser, RealtimeUserProps } from './RealtimeUser';
import { Time } from './Time';

/**
 * Primitive props for Realtime entity
 */
export interface RealtimeProps {
  _id?: string; // Optional ID for MongoDB or other database usage
  date: string; // YYYY-MM-DD format
  userList?: RealtimeUserProps[];
}

export class Realtime {
  public _id?: string; // Optional ID for MongoDB or other database usage
  public date: string;
  public userList: RealtimeUser[];

  constructor(props: RealtimeProps) {
    if (!props.date) throw new Error('Realtime.date is required');
    this._id = props._id || null;
    this.date = props.date;
    this.userList = (props.userList ?? []).map((u) => new RealtimeUser(u));
  }

  public addUser(user: RealtimeUserProps) {
    this.userList.push(new RealtimeUser(user));
  }

  public patchUser(userProps: RealtimeUserProps): void {
    const idx = this.userList.findIndex((u) => u.user === userProps.user);
    const newUser = new RealtimeUser(userProps);

    if (idx === -1) {
      // 없으면 추가
      this.userList.push(newUser);
    } else {
      // 있으면 교체
      this.userList[idx] = newUser;
    }
  }

  updateUserTime(userId: string, start: string, end: string): void {
    const user = this.userList.find((u) => u.user === userId);
    if (!user) {
      throw new Error(`RealtimeUser not found: ${userId}`);
    }
    // Time 객체 교체
    user.time = new Time(start, end);
  }

  updateStatus(userId: string, status: string): void {
    const user = this.userList.find((u) => u.user === userId);
    if (!user) {
      throw new Error(`RealtimeUser not found: ${userId}`);
    }
    // 상태 업데이트
    user.status = status as RealtimeUserProps['status'];
  }

  updateComment(userId: string, comment: string): void {
    const user = this.userList.find((u) => u.user === userId);
    if (!user) {
      throw new Error(`RealtimeUser not found: ${userId}`);
    }

    user.comment = new Comment(comment);
  }

  deleteVote(userId: string): void {
    this.userList = this.userList.filter(
      (user) => (user.user as IUser)._id.toString() !== userId,
    );
  }

  toPrimitives(): RealtimeProps {
    return {
      date: this.date,
      userList: this.userList.map((u) => u.toPrimitives()),
    };
  }
}
