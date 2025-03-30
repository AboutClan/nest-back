// src/domain/entities/realtime/Realtime.ts
import { RealtimeUser, RealtimeUserProps } from './RealtimeUser';

export interface RealtimeProps {
  date: Date;
  userList?: RealtimeUserProps[];
}

export class Realtime {
  private date: Date;
  private userList: RealtimeUser[];

  constructor(props: RealtimeProps) {
    // date가 필수라면 검증
    this.date = props.date;
    // userList 초기화
    this.userList = (props.userList ?? []).map((u) => new RealtimeUser(u));
  }

  getDate(): Date {
    return this.date;
  }

  getUserList(): RealtimeUser[] {
    return this.userList;
  }

  // 예: 사용자 목록에 추가
  addUser(userProps: RealtimeUserProps) {
    this.userList.push(new RealtimeUser(userProps));
  }

  // 예: 사용자 제거/업데이트 로직 등
  removeUser(userId: string): boolean {
    const initialLength = this.userList.length;
    this.userList = this.userList.filter((u) => u.getUserId() !== userId);
    return this.userList.length !== initialLength;
  }

  toPrimitives(): RealtimeProps {
    return {
      date: this.date,
      userList: this.userList.map((u) => u.toPrimitives()),
    };
  }
}
