export type NoticeStatus = 'pending' | 'refusal' | 'approval' | 'response';

/** Notice 유형 */
export type NoticeType = 'like' | 'friend' | 'alphabet';

/** 도메인 엔티티 생성자에 필요한 필드 */
export interface NoticeProps {
  from: string;
  to: string;
  type?: NoticeType | null;
  message: string;
  status?: NoticeStatus | null;
  sub?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 도메인 엔티티: Notice
 * - DB, Mongoose 등의 의존성 없이 순수하게 비즈니스 로직과 데이터만 캡슐화
 */
export class Notice {
  private from: string;
  private to: string;
  private type: NoticeType;
  private message: string;
  private status?: NoticeStatus;
  private sub?: string | null;
  private createdAt?: Date;
  private updatedAt?: Date;

  constructor(props: NoticeProps) {
    // 필수 값 검증
    if (!props.from) throw new Error('from is required');
    if (!props.to) throw new Error('to is required');
    if (!props.message) throw new Error('message is required');

    this.from = props.from;
    this.to = props.to;
    this.type = (props.type ?? 'like') as NoticeType;
    this.message = props.message;
    this.status = props.status ?? undefined;
    this.sub = props.sub ?? null;

    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  // Getter methods
  getFrom(): string {
    return this.from;
  }

  getTo(): string {
    return this.to;
  }

  getType(): NoticeType {
    return this.type;
  }

  getMessage(): string {
    return this.message;
  }

  getStatus(): NoticeStatus | undefined {
    return this.status;
  }

  getSub(): string | null | undefined {
    return this.sub;
  }

  getCreatedAt(): Date | undefined {
    return this.createdAt;
  }

  getUpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  // 예시: 도메인 로직(상태 변경, 메시지 수정 등)
  updateMessage(newMessage: string) {
    if (!newMessage.trim()) {
      throw new Error('Cannot set empty message');
    }
    this.message = newMessage;
    this.updatedAt = new Date();
  }

  updateStatus(newStatus: NoticeStatus) {
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  // etc.

  /**
   * 도메인 엔티티 → 순수 데이터 형태 (Plain object)
   * Repository나 Controller 레벨에서 DB 저장 or 직렬화할 때 사용
   */
  toPrimitives(): NoticeProps {
    return {
      from: this.from,
      to: this.to,
      type: this.type,
      message: this.message,
      status: this.status,
      sub: this.sub,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
