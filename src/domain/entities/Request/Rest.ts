// src/domain/entities/Rest.ts
import { Dayjs } from 'dayjs';

export type RestType = '일반' | '특별';

export interface RestProps {
  type: RestType;
  start: Dayjs; // domain uses Dayjs
  end: Dayjs;
}

export class Rest {
  private type: RestType;
  private start: Dayjs;
  private end: Dayjs;

  constructor(props: RestProps) {
    if (!props.type) {
      throw new Error('type is required for Rest');
    }
    if (!props.start || !props.end) {
      throw new Error('start and end are required for Rest');
    }
    this.type = props.type;
    this.start = props.start;
    this.end = props.end;
  }

  getType(): RestType {
    return this.type;
  }
  getStart(): Dayjs {
    return this.start;
  }
  getEnd(): Dayjs {
    return this.end;
  }

  toPrimitives(): {
    type: RestType;
    start: string; // ISO string
    end: string;
  } {
    return {
      type: this.type,
      start: this.start.toISOString(),
      end: this.end.toISOString(),
    };
  }
}
