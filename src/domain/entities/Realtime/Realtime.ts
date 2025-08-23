import { IRealtimeUser } from 'src/routes/realtime/realtime.entity';
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

  public isLate(userId: string) {
    const user = this.userList.find((u) => u.user === userId);
    if (!user) {
      throw new Error(`RealtimeUser not found: ${userId}`);
    }
    const userStart = user.time.start;
    const userAttend = user.arrived;

    const start = new Date(userStart);
    const attend = new Date(userAttend);

    const diff = attend.getTime() - start.getTime();
    const diffMinutes = diff / (60 * 1000); // 분 단위로 계산
    return diffMinutes >= 60; // 60분 이상
  }

  public isSolo(userId: string) {
    const user = this.userList.find((u) => u.user === userId);
    if (!user) {
      throw new Error(`RealtimeUser not found: ${userId}`);
    }
    return user.status === 'solo';
  }

  public updateAbsence(userId: string, absence: boolean) {
    const user = this.userList.find(
      (u) => (u.user as IUser)._id.toString() === userId.toString(),
    );
    if (!user) {
      throw new Error(`RealtimeUser not found: ${userId}`);
    }
    user.updateAbsence(userId, absence);
  }

  public isOpen(userId: string) {
    const user = this.userList.find((u) => u.user === userId);
    if (!user) {
      throw new Error(`RealtimeUser not found: ${userId}`);
    }
    return user.status === 'open';
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
    const user = this.userList.find(
      (u) => (u.user as IUser)._id.toString() === userId,
    );
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

  deleteVote(userId: string): boolean {
    //user list에 있으면 status 반환
    const user = this.userList.find((u) => u.user === userId);
    if (!user) {
      return false;
    }
    this.userList = this.userList.filter(
      (user) => (user.user as IUser)._id.toString() !== userId,
    );
    if (user.status === 'open') {
      return true;
    }
  }

  toPrimitives(): RealtimeProps {
    return {
      _id: this._id,
      date: this.date,
      userList: this.userList.map((u) => u.toPrimitives()),
    };
  }

  static formatRealtime(member: IRealtimeUser) {
    const form = {
      user: member.user,
      time: {
        start: member.time?.start,
        end: member.time?.end,
      },
      attendance: {
        time: member.arrived,
        memo: member?.memo,
        attendanceImage: member.image,
        type: member.arrived ? 'arrived' : null,
      },
      comment: {
        text: member.comment?.text,
      },
      place: { location: (member as any).place },
      status: member.status,
    };

    return form;
  }
}
