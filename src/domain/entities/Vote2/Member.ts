// src/domain/entities/Member.ts

export interface MemberProps {
  userId: string;
  arrived?: Date;
  memo?: string;
  img?: string;
  start?: string;
  end?: string;
  absence?: boolean;
}

export class Member {
  private userId: string;
  private arrived?: Date;
  private memo?: string;
  private img?: string;
  private start?: string;
  private end?: string;
  private absence: boolean;

  constructor(props: MemberProps) {
    if (!props.userId) {
      throw new Error('userId is required');
    }
    this.userId = props.userId;
    this.arrived = props.arrived;
    this.memo = props.memo;
    this.img = props.img;
    this.start = props.start;
    this.end = props.end;
    this.absence = props.absence ?? false;
  }

  getUserId(): string {
    return this.userId;
  }
  getArrived(): Date | undefined {
    return this.arrived;
  }
  getMemo(): string | undefined {
    return this.memo;
  }
  getImg(): string | undefined {
    return this.img;
  }
  getStart(): string | undefined {
    return this.start;
  }
  getEnd(): string | undefined {
    return this.end;
  }
  isAbsent(): boolean {
    return this.absence;
  }

  toPrimitives(): MemberProps {
    return {
      userId: this.userId,
      arrived: this.arrived,
      memo: this.memo,
      img: this.img,
      start: this.start,
      end: this.end,
      absence: this.absence,
    };
  }
}
