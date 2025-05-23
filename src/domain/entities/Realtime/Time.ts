// src/domain/entities/realtime/Time.ts

export interface TimeProps {
  start: string; // ISO date string
  end: string; // ISO date string
}

export class Time {
  private start: string;
  private end: string;

  constructor(props: TimeProps) {
    // 추가 검증 가능 (start <= end?)
    this.start = props.start;
    this.end = props.end;
  }

  getStart(): string {
    return this.start;
  }

  getEnd(): string {
    return this.end;
  }

  toPrimitives(): TimeProps {
    return {
      start: this.start,
      end: this.end,
    };
  }
}
