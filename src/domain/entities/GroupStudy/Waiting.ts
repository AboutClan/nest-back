// src/domain/entities/groupStudy/Waiting.ts

export interface WaitingProps {
  userId: string;
  answer?: string;
  pointType: string;
}

export class Waiting {
  private userId: string;
  private answer?: string;
  private pointType: string;

  constructor(props: WaitingProps) {
    this.userId = props.userId;
    this.answer = props.answer;
    this.pointType = props.pointType;
  }

  getUserId(): string {
    return this.userId;
  }

  getAnswer(): string | undefined {
    return this.answer;
  }

  getPointType(): string {
    return this.pointType;
  }

  toPrimitives(): WaitingProps {
    return {
      userId: this.userId,
      answer: this.answer,
      pointType: this.pointType,
    };
  }
}
