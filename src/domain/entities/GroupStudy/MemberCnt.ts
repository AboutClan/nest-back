// src/domain/entities/groupStudy/MemberCnt.ts

export interface MemberCntProps {
  min: number;
  max: number;
}

export class MemberCnt {
  private min: number;
  private max: number;

  constructor(props: MemberCntProps) {
    this.min = props.min;
    this.max = props.max;
  }

  getMin(): number {
    return this.min;
  }

  getMax(): number {
    return this.max;
  }

  toPrimitives(): MemberCntProps {
    return {
      min: this.min,
      max: this.max,
    };
  }
}
