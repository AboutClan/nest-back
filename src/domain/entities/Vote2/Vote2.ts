import { Participation, ParticipationProps } from './Vote2Participation';
import { Result, ResultProps } from './Vote2Result';

export interface Vote2Props {
  date: string;
  participations: ParticipationProps[];
  results: ResultProps[];
}

export class Vote2 {
  date: string;
  participations: Participation[];
  results: Result[];

  constructor(props: Vote2Props) {
    this.date = props.date;
    this.participations = props.participations.map((p) => new Participation(p));
    this.results = props.results.map((r) => new Result(r));
  }

  toPrimitives(): Vote2Props {
    return {
      date: this.date,
      participations: this.participations.map((p) => p.toPrimitives()),
      results: this.results.map((r) => r.toPrimitives()),
    };
  }
}
