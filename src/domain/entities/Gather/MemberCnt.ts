// src/domain/entities/gather/MemberCnt.ts

export interface MemberCntProps {
  min: number;
  max: number;
}

export class MemberCnt {
  private min: number;
  private max: number;

  constructor(props: MemberCntProps) {
    if (props.min < 0) throw new Error('Min cannot be negative');
    if (props.max < props.min) throw new Error('Max cannot be less than Min');

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
