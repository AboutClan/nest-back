// src/domain/entities/Realtime.ts
import { RealtimeUser, RealtimeUserProps } from './RealtimeUser';

export interface RealtimeProps {
  date: Date;
  userList?: RealtimeUserProps[];
}

export class Realtime {
  private date: Date;
  private userList: RealtimeUser[];

  constructor(props: RealtimeProps) {
    if (!props.date) {
      throw new Error('date is required');
    }

    this.date = props.date;
    this.userList = (props.userList ?? []).map(
      (userProps) => new RealtimeUser(userProps),
    );
  }

  getDate(): Date {
    return this.date;
  }

  getUserList(): RealtimeUser[] {
    return this.userList;
  }

  // ex) domain logic: add user, remove user, etc.
  addUser(userProps: RealtimeUserProps) {
    this.userList.push(new RealtimeUser(userProps));
  }

  toPrimitives(): RealtimeProps {
    return {
      date: this.date,
      userList: this.userList.map((u) => u.toPrimitives()),
    };
  }
}
