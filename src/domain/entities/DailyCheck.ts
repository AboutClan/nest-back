/**
 * 도메인에서 사용될 속성(비즈니스 관점)
 */
export interface DailyCheckProps {
  id?: string;
  uid: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 비즈니스 로직(검증, 메서드)을 담는 DailyCheck 엔티티
 */
export class DailyCheck {
  public id: string;
  public uid: string;
  public name: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(props: DailyCheckProps) {
    this.id = props.id || '';
    this.uid = props.uid;
    this.name = props.name;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  /** 도메인 로직 예시: name 변경 */
  changeName(newName: string): void {
    if (!newName || !newName.trim()) {
      throw new Error('Name cannot be empty');
    }
    this.name = newName;
    this.updatedAt = new Date(); // 변경 시점 반영
  }

  /**
   * Domain Entity -> 단순 객체 변환(주로 Repository 저장/전달 시 사용)
   */
  toPrimitives(): DailyCheckProps {
    return {
      id: this.id,
      uid: this.uid,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
