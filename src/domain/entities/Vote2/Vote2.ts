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

  removeParticipationByUserId(userId: string) {
    this.participations = this.participations.filter(
      (p) => p.userId !== userId,
    );
  }

  setOrUpdateParticipation(newParticipation: Participation) {
    const idx = this.participations.findIndex(
      (p) => p.userId === newParticipation.userId,
    );
    if (idx !== -1) {
      // 이미 존재하면 갱신
      this.participations[idx] = newParticipation;
    } else {
      // 없으면 추가
      this.participations.push(newParticipation);
    }
  }

  toPrimitives(): Vote2Props {
    return {
      date: this.date,
      participations: this.participations.map((p) => p.toPrimitives()),
      results: this.results.map((r) => r.toPrimitives()),
    };
  }
}
