export interface IRest {
  type?: string;
  startDate?: Date;
  endDate?: Date;
  content?: string;
  restCnt?: number;
  cumulativeSum?: number;
}

export class Rest {
  constructor(
    public type?: string,
    public startDate?: Date,
    public endDate?: Date,
    public content?: string,
    public restCnt?: number,
    public cumulativeSum?: number,
  ) {
    this.type = type || '';
    this.startDate = startDate ? new Date(startDate) : new Date();
    this.endDate = endDate ? new Date(endDate) : new Date();
    this.content = content || '';
    this.restCnt = restCnt || 0;
    this.cumulativeSum = cumulativeSum || 0;
  }

  setRest(
    type: string,
    startDate: string,
    endDate: string,
    content: string,
    dayDiff: number,
  ) {
    this.type = type;
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
    this.content = content;
    this.restCnt += 1; // Increment rest count
    this.cumulativeSum += dayDiff; // Update cumulative sum with the difference in days
  }

  toPrimitives() {
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
