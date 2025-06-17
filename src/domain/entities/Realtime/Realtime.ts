import { RealtimeUser, RealtimeUserProps } from './RealtimeUser';

/**
 * Primitive props for Realtime entity
 */
export interface RealtimeProps {
  date: Date;
  userList?: RealtimeUserProps[];
}

export class Realtime {
  public date: Date;
  public userList: RealtimeUser[];

  constructor(props: RealtimeProps) {
    if (!props.date) throw new Error('Realtime.date is required');
    this.date = props.date;
    this.userList = (props.userList ?? []).map((u) => new RealtimeUser(u));
  }

  addUser(user: RealtimeUserProps) {
    this.userList.push(new RealtimeUser(user));
  }

  toPrimitives(): RealtimeProps {
    return {
      date: this.date,
      userList: this.userList.map((u) => u.toPrimitives()),
    };
  }
}
