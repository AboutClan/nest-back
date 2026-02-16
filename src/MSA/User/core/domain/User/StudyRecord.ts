export class StudyRecord {
  constructor(
    public accumulationMinutes?: number,
    public accumulationCnt?: number,
    public monthCnt?: number,
    public monthMinutes?: number,
  ) {}

  setRecord(
    accumulationMinutes: number,
    accumulationCnt: number,
    monthCnt: number,
    monthMinutes: number,
  ): void {
    this.accumulationMinutes += accumulationMinutes;
    this.accumulationCnt += accumulationCnt;
    this.monthCnt += monthCnt;
    this.monthMinutes += monthMinutes;
  }

  toPrimitives() {
    return {
      accumulationMinutes: this.accumulationMinutes,
      accumulationCnt: this.accumulationCnt,
      monthCnt: this.monthCnt,
      monthMinutes: this.monthMinutes,
    };
  }
}

export interface IStudyRecord {
  accumulationMinutes?: number;
  accumulationCnt?: number;
  monthCnt?: number;
  monthMinutes?: number;
}
