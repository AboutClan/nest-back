// src/domain/entities/groupStudy/WeekRecord.ts

export interface WeekRecordProps {
  uid: string;
  name: string;
  attendRecord: string[];
  attendRecordSub?: string[];
}

export class WeekRecord {
  private uid: string;
  private name: string;
  private attendRecord: string[];
  private attendRecordSub: string[];

  constructor(props: WeekRecordProps) {
    if (!props.uid) {
      throw new Error('WeekRecord uid is required.');
    }
    if (!props.name) {
      throw new Error('WeekRecord name is required.');
    }
    this.uid = props.uid;
    this.name = props.name;
    this.attendRecord = props.attendRecord ?? [];
    this.attendRecordSub = props.attendRecordSub ?? [];
  }

  getUid(): string {
    return this.uid;
  }

  getName(): string {
    return this.name;
  }

  getAttendRecord(): string[] {
    return this.attendRecord;
  }

  getAttendRecordSub(): string[] {
    return this.attendRecordSub;
  }

  toPrimitives(): WeekRecordProps {
    return {
      uid: this.uid,
      name: this.name,
      attendRecord: [...this.attendRecord],
      attendRecordSub: [...this.attendRecordSub],
    };
  }
}
