export interface RestProps {
  type: string;
  startDate: Date;
  endDate: Date;
  content: string;
  restCnt: number;
  cumulativeSum: number;
}

export class Rest {
  private type: string;
  private startDate: Date;
  private endDate: Date;
  private content: string;
  private restCnt: number;
  private cumulativeSum: number;

  constructor(props: RestProps) {
    if (!props.type) throw new Error('type is required');
    if (!props.startDate || !props.endDate) {
      throw new Error('startDate and endDate are required');
    }
    this.type = props.type;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this.content = props.content;
    this.restCnt = props.restCnt ?? 0;
    this.cumulativeSum = props.cumulativeSum ?? 0;
  }

  getType(): string {
    return this.type;
  }
  getStartDate(): Date {
    return this.startDate;
  }
  getEndDate(): Date {
    return this.endDate;
  }
  getContent(): string {
    return this.content;
  }
  getRestCnt(): number {
    return this.restCnt;
  }
  getCumulativeSum(): number {
    return this.cumulativeSum;
  }

  toPrimitives(): RestProps {
    return {
      type: this.type,
      startDate: this.startDate,
      endDate: this.endDate,
      content: this.content,
      restCnt: this.restCnt,
      cumulativeSum: this.cumulativeSum,
    };
  }
}
