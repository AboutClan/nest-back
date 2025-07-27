import { DateUtils } from 'src/utils/Date';
import { Participation, ParticipationProps } from './Vote2Participation';
import { Result, ResultProps } from './Vote2Result';
import { VoteComment } from './Vote2VoteComment';

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

  updateResult(userId: string, start: string, end: string) {
    this.results.forEach((result) => {
      result.members.forEach((member) => {
        if (member.userId === userId) {
          member.start = start;
          member.end = end;
        }
      });
    });
  }

  setComment(userId: string, comment: string) {
    this.results.forEach((result) => {
      result.members.forEach((member) => {
        if (member.userId === userId) {
          member.comment = new VoteComment({ comment });
        }
      });
    });
  }

  setResult(results: Result[]) {
    this.results = results.map((r) => new Result(r as any));
  }

  removeParticipationByUserId(userId: string) {
    this.participations = this.participations.filter(
      (p) => p.userId !== userId,
    );
  }

  setArrive(userId: string, memo: any, end: string) {
    const result = this.results.find((r) =>
      r.members.some((m) => m.userId === userId),
    );
    if (result) {
      const member = result.members.find((m) => m.userId === userId);
      if (member) {
        member.arrived = new Date();
        memo && (member.memo = memo);
        end && (member.end = end);
        member.start = DateUtils.getNowDate().toISOString();
      }
    }
  }

  setAbsence(userId: string, message: string) {
    const result = this.results.find((r) =>
      r.members.some((m) => m.userId === userId),
    );
    if (result) {
      const member = result.members.find((m) => m.userId === userId);
      if (member) {
        member.absence = true;
        member.comment = new VoteComment({ comment: message });
      }
    }
  }

  setParticipate(placeId: string, participateData: Partial<Participation>) {
    const newResult = this.results.find((r) => r.placeId === placeId);
    if (!newResult) {
      throw new Error(`Place with ID ${placeId} not found in results.`);
    }

    const userExists = this.participations.some(
      (p) => p.userId === participateData.userId,
    );

    if (!userExists) {
      this.results.push(
        new Result({
          placeId,
          members: [
            new Participation({
              userId: participateData.userId,
              latitude: participateData.latitude || '',
              longitude: participateData.longitude || '',
              start: participateData.start,
              end: participateData.end,
              comment: new VoteComment(participateData.comment),
            }),
          ],
        }),
      );
    }
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
