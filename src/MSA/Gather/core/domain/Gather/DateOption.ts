// src/domain/entities/gather/DateOption.ts

export interface DateOptionProps {
  date: string;
  voters?: string[];
}

export class DateOption {
  public date: string;
  public voters: string[];

  constructor(props: DateOptionProps) {
    this.date = props.date;
    this.voters = props.voters ?? [];
  }

  toPrimitives(): DateOptionProps {
    return {
      date: this.date,
      voters: this.voters,
    };
  }
}
