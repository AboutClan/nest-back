// src/domain/entities/gather/Waiting.ts

export interface WaitingProps {
  user: string;
  phase: string;
  createdAt?: Date | null;
}

export class Waiting {
  public user: string;
  public phase: string;
  public createdAt: Date | null;

  constructor(props: WaitingProps) {
    this.user = props.user;
    this.phase = props.phase;
    // 시각이 없던 예전 대기열은 null로 둔다(null을 "지금"으로 채우면 상시 행사 짝짓기에서 방금 신청한 것처럼 보인다).
    this.createdAt =
      props.createdAt === undefined ? new Date() : props.createdAt;
  }

  toPrimitives(): WaitingProps {
    return {
      user: this.user,
      phase: this.phase,
      createdAt: this.createdAt,
    };
  }
}
