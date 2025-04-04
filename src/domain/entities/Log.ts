export interface LogMetaProps {
  type: string; // enum: 'score', 'point', 'deposit' 등
  uid: number; // Zod에는 number, Mongoose 스키마는 uid: String이지만 여기서는 number 가정
  value: number;
  sub?: string | null; // 선택적
}

/** Log 엔티티에 필요한 필드(도메인 관점) */
export interface LogProps {
  timeStamp: Date;
  level: string;
  message: string;
  meta: LogMetaProps;
}

/**
 * 도메인 엔티티: Log
 * - DB, zod 의존성 없이, 로직 & 데이터 캡슐화
 */
export class Log {
  private timeStamp: Date;
  private level: string;
  private message: string;
  private meta: LogMetaProps;

  constructor(props: LogProps) {
    if (!props.timeStamp) {
      throw new Error('timeStamp is required');
    }
    if (!props.level) {
      throw new Error('level is required');
    }
    if (!props.message) {
      throw new Error('message is required');
    }
    if (!props.meta || !props.meta.type) {
      throw new Error('meta.type is required');
    }

    this.timeStamp = props.timeStamp;
    this.level = props.level;
    this.message = props.message;
    this.meta = {
      type: props.meta.type,
      uid: props.meta.uid,
      value: props.meta.value,
      sub: props.meta.sub ?? null,
    };
  }

  /** Getters (필요에 따라 추가/수정) */
  getTimeStamp(): Date {
    return this.timeStamp;
  }

  getLevel(): string {
    return this.level;
  }

  getMessage(): string {
    return this.message;
  }

  getMeta(): LogMetaProps {
    return this.meta;
  }

  /**
   * 도메인 엔티티를 순수 데이터(Plain Object)로 변환
   * Repository나 외부 레이어에서 DB 저장/직렬화에 사용
   */
  toPrimitives(): LogProps {
    return {
      timeStamp: this.timeStamp,
      level: this.level,
      message: this.message,
      meta: { ...this.meta },
    };
  }
}
