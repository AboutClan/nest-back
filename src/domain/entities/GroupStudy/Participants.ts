// src/domain/entities/groupStudy/Participants.ts

export type UserRole = 'admin' | 'manager' | 'member' | 'outsider';

export interface ParticipantsProps {
  userId: string; // DB에서는 ObjectId, Domain에서는 string
  randomId?: number;
  role: UserRole;
  attendCnt: number;
  weekAttendance?: boolean;
}

export class Participants {
  private userId: string;
  private randomId?: number;
  private role: UserRole;
  private attendCnt: number;
  private weekAttendance: boolean;

  constructor(props: ParticipantsProps) {
    if (!props.userId) {
      throw new Error('Participants userId is required.');
    }
    if (!props.role) {
      throw new Error('Participants role is required.');
    }

    this.userId = props.userId;
    this.randomId = props.randomId;
    this.role = props.role;
    this.attendCnt = props.attendCnt ?? 0;
    this.weekAttendance = props.weekAttendance ?? false;
  }

  getUserId(): string {
    return this.userId;
  }

  getRandomId(): number | undefined {
    return this.randomId;
  }

  getRole(): UserRole {
    return this.role;
  }

  getAttendCnt(): number {
    return this.attendCnt;
  }

  hasWeekAttendance(): boolean {
    return this.weekAttendance;
  }

  toPrimitives(): ParticipantsProps {
    return {
      userId: this.userId,
      randomId: this.randomId,
      role: this.role,
      attendCnt: this.attendCnt,
      weekAttendance: this.weekAttendance,
    };
  }
}
