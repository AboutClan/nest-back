// src/domain/entities/Vote2.ts
import { Participation, ParticipationProps } from './Participation';
import { Result, ResultProps } from './Result';

export interface Vote2Props {
  date: Date;
  participations: ParticipationProps[];
  results: ResultProps[];
}

export class Vote2 {
  private date: Date;
  private participations: Participation[];
  private results: Result[];

  constructor(props: Vote2Props) {
    if (!props.date) {
      throw new Error('date is required');
    }

    this.date = props.date;
    this.participations = (props.participations ?? []).map(
      (p) => new Participation(p),
    );
    this.results = (props.results ?? []).map((r) => new Result(r));
  }

  getDate(): Date {
    return this.date;
  }
  getParticipations(): Participation[] {
    return this.participations;
  }
  getResults(): Result[] {
    return this.results;
  }

  addParticipation(partProps: ParticipationProps) {
    this.participations.push(new Participation(partProps));
  }

  addResult(resultProps: ResultProps) {
    this.results.push(new Result(resultProps));
  }

  toPrimitives(): Vote2Props {
    return {
      date: this.date,
      participations: this.participations.map((p) => p.toPrimitives()),
      results: this.results.map((r) => r.toPrimitives()),
    };
  }
}
