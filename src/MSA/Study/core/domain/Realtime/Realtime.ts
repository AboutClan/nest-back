import { IRealtimeUser } from 'src/MSA/Study/entity/realtime.entity';
import { getScheduledAtOnDate } from 'src/utils/Date';
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

  /** time.start의 시:분을 이 Realtime의 날짜(KST) 기준 실제 시각으로 맞춘다. */
  public getScheduledAt(raw: string) {
    return getScheduledAtOnDate(this.date, raw);
  }

  public findUser(userId: string) {
    return this.userList.find(
      (u) => u.user.toString() === userId?.toString(),
    );
  }

  public hasUser(userId: string): boolean {
    return !!this.findUser(userId);
  }

  /**
   * callerId가 targetId와 같은 스터디의 개설자인지.
   *
   * realtime은 날짜당 문서 1개에 여러 장소의 스터디가 평평하게 섞여 있어
   * "어느 스터디인지"를 장소 좌표로 판정한다. 참여 신청자가 스스로를 승인하는 걸
   * 막기 위해 status 변경 권한 검사에 쓴다.
   */
  public isHostOf(callerId: string, targetId: string): boolean {
    const caller = this.findUser(callerId);
    const target = this.findUser(targetId);

    if (!caller || !target || caller.status !== 'open') return false;

    return (
      caller.place?.latitude === target.place?.latitude &&
      caller.place?.longitude === target.place?.longitude
    );
  }

  /**
   * 예정 시작 시각보다 60분 이상 늦게 출석했는지.
   *
   * time.start의 날짜는 믿지 않는다 — 개설 화면은 14일 뒤 날짜까지 고를 수 있는데
   * 프론트가 시각을 만들 때 오늘 날짜를 쓰므로, 미래 날짜 개설에는 개설한 날짜가
   * 박혀 있다. 절대 시각으로 비교하면 며칠 차이가 나 무조건 지각이 된다.
   *
   * 멤버를 못 찾으면 예전에는 throw했다. 판정이 안 될 뿐 출석 자체는 되어야 하므로
   * Vote2.isLate와 같이 false를 돌려준다.
   */
  public isLate(userId: string) {
    const user = this.userList.find(
      (u) => u.user.toString() === userId.toString(),
    );
    if (!user?.arrived || !user?.time?.start) {
      return false;
    }

    const scheduledStart = this.getScheduledAt(user.time.start);
    if (!scheduledStart) {
      return false;
    }

    const diffMinutes =
      (new Date(user.arrived).getTime() - scheduledStart.getTime()) /
      (60 * 1000);

    return diffMinutes >= 60;
  }

  public updateAbsence(userId: string, absence: boolean, message?: string) {
    const user = this.userList.find(
      (u) => u.user.toString() === userId.toString(),
    );
    if (!user) {
      throw new Error(`RealtimeUser not found: ${userId}`);
    }
    user.updateAbsence(userId, absence, message);
  }

  public isOpen(userId: string) {
    const user = this.userList.find((u) => u.user.toString() === userId);

    return user?.status === 'open' || user?.status === 'participation';
  }

  public addUser(user: RealtimeUserProps) {
    this.userList.push(new RealtimeUser(user));
  }

  public patchUser(userProps: RealtimeUserProps): void {
    const idx = this.userList.findIndex(
      (u) => u.user.toString() === userProps.user.toString(),
    );
    const newUser = new RealtimeUser(userProps);

    if (idx === -1) {
      // 없으면 추가
      this.userList.push(newUser);
    } else {
      // 있으면 교체
      this.userList[idx] = newUser;
    }
  }

  /**
   * 개설자·참여 확정자의 출석 처리. 실제 도착 시각은 arrived에만 기록한다.
   *
   * 예전에는 time.start을 출석 시각으로 덮어썼다. 그러면 개설 때 정한 예정 시작
   * 시각이 사라지고, 직후에 계산하는 isLate가 arrived - start = 0이 되어 지각 판정이
   * 영구히 false가 된다(Vote2.setArrive에 있던 것과 같은 문제).
   */
  public patchNotSoloUser(
    userId: string,
    endTime: string,
    arrived: Date,
    memo: string,
    image: string,
  ): void {
    const idx = this.userList.findIndex(
      (u) => u.user.toString() === userId.toString(),
    );
    if (idx === -1) return;

    this.userList[idx].time.end = endTime;
    this.userList[idx].arrived = arrived;
    this.userList[idx].memo = memo;
    this.userList[idx].image = image;
  }

  increaseHeartCount(userId: string): void {
    const user = this.userList.find((u) => u.user.toString() === userId);

    if (!user) {
      throw new Error(`RealtimeUser not found: ${userId}`);
    }
    // Time 객체 교체
    user.heartCnt += 1;
  }
  updateUserTime(userId: string, start: string, end: string): void {
    const user = this.userList.find((u) => u.user.toString() === userId);

    if (!user) {
      throw new Error(`RealtimeUser not found: ${userId}`);
    }
    // Time 객체 교체
    user.time = new Time(start, end);
  }

  updateStatus(userId: string, status: string): void {
    const user = this.userList.find((u) => u.user.toString() === userId);
    if (!user) {
      throw new Error(`RealtimeUser not found: ${userId}`);
    }
    // 상태 업데이트
    user.status = status as RealtimeUserProps['status'];
  }

  updateComment(userId: string, comment: string): void {
    const user = this.userList.find((u) => u.user.toString() === userId);
    if (!user) {
      throw new Error(`RealtimeUser not found: ${userId}`);
    }

    user.comment = new Comment(comment);
  }

  deleteVote(userId: string): boolean {
    //user list에 있으면 status 반환

    const user = this.userList.find((u) => u.user.toString() === userId);
    if (!user) {
      return false;
    }
    this.userList = this.userList.filter(
      (user) => user.user.toString() !== userId,
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
    if ((member.place as any)?.registrant) {
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
          type: member.absence ? 'absenced' : member.arrived ? 'arrived' : null,
        },
        comment: {
          text: member.comment?.text,
        },
        place: { ...member.place },
        status: member.status,
        heartCnt: member.heartCnt,
      };
      return form;
    } else {
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
          type: member.absence ? 'absenced' : member.arrived ? 'arrived' : null,
        },
        comment: {
          text: member.comment?.text,
        },
        place: { location: member.place },
        status: member.status,
        heartCnt: member.heartCnt,
      };
      return form;
    }
  }
}
