export interface TimeProps {
  start: string; // ISO Date string
  end: string; // ISO Date string
}

export class Time {
  public start: string;
  public end: string;

  constructor(start: string, end: string) {
    if (!start) throw new Error('Time.start is required');
    if (!end) throw new Error('Time.end is required');
    this.start = start;
    this.end = end;
  }

  toPrimitives(): TimeProps {
    return { start: this.start, end: this.end };
  }
}
