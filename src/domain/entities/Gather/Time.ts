export interface TimeProps {
  hours?: number | null;
  minutes?: number | null;
}

export class Time {
  private hours: number | null;
  private minutes: number | null;

  constructor(props: TimeProps) {
    this.hours = props.hours ?? null;
    this.minutes = props.minutes ?? null;
  }

  getHours(): number | null {
    return this.hours;
  }

  getMinutes(): number | null {
    return this.minutes;
  }

  toPrimitives(): TimeProps {
    return {
      hours: this.hours,
      minutes: this.minutes,
    };
  }
}
