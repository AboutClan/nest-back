// src/domain/entities/groupStudy/Attendance.ts

import { WeekRecord, WeekRecordProps } from './WeekRecord';

export interface AttendanceProps {
  firstDate?: string;
  lastWeek?: WeekRecordProps[];
  thisWeek?: WeekRecordProps[];
}

export class Attendance {
  private firstDate?: string;
  private lastWeek: WeekRecord[];
  private thisWeek: WeekRecord[];

  constructor(props: AttendanceProps) {
    this.firstDate = props.firstDate;
    this.lastWeek = (props.lastWeek ?? []).map((wr) => new WeekRecord(wr));
    this.thisWeek = (props.thisWeek ?? []).map((wr) => new WeekRecord(wr));
  }

  getFirstDate(): string | undefined {
    return this.firstDate;
  }

  getLastWeek(): WeekRecord[] {
    return this.lastWeek;
  }

  getThisWeek(): WeekRecord[] {
    return this.thisWeek;
  }

  toPrimitives(): AttendanceProps {
    return {
      firstDate: this.firstDate,
      lastWeek: this.lastWeek.map((wr) => wr.toPrimitives()),
      thisWeek: this.thisWeek.map((wr) => wr.toPrimitives()),
    };
  }
}
