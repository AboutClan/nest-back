import { DateUtils } from 'src/utils/Date';
import { IUser } from '../User/User';
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

  isVoteBefore(userId: string) {
    const participant = this.participations.find((p) => p.userId === userId);
    if (!participant) {
      return false;
    }
    return participant.isBeforeResult;
  }

  isLate(userId: string) {
    const result = this.results.find((r) =>
      r.members.some((m) => m.userId === userId),
    );
    if (!result) {
      return false;
    }
    const member = result.members.find((m) => m.userId === userId);
    if (!member) {
      return false;
    }
    const start = new Date(member.start);
    const arrived = new Date(member.arrived);
    const diff = arrived.getTime() - start.getTime();
    const diffMinutes = diff / (60 * 1000);
    return diffMinutes >= 60;
  }

  updateResult(userId: string, start: string, end: string) {
    this.results.forEach((result) => {
      result.members.forEach((member) => {
        if ((member.userId as IUser)._id.toString() === userId) {
          member.start = start;
          member.end = end;
        }
      });
    });
  }

  setComment(userId: string, comment: string) {
    this.results.forEach((result) => {
      result.members.forEach((member) => {
        if ((member.userId as IUser)._id.toString() === userId) {
          member.comment = new VoteComment({ comment });
        }
      });
    });
  }

  setResult(results: Result[]) {
    this.results = results.map((r) => new Result(r as any));
  }

  removeParticipationByUserId(userId: string) {
    if (
      this.participations.some((p) => p.userId.toString() === userId.toString())
    ) {
      this.participations = this.participations.filter(
        (p) => p.userId.toString() !== userId.toString(),
      );
      return true;
    } else {
      return false;
    }
  }

  setArrive(userId: string, memo: any, end: string, imageUrl?: string) {
    const result = this.results.find((r) =>
      r.members.some((m) => (m.userId as IUser)._id.toString() === userId),
    );
    if (result) {
      const member = result.members.find(
        (m) => (m.userId as IUser)._id.toString() === userId,
      );
      if (member) {
        member.arrived = new Date();
        memo && (member.memo = memo);
        end && (member.end = end);
        member.start = DateUtils.getNowDate().toISOString();
        imageUrl && (member.imageUrl = imageUrl);
      }
    }
  }

  setAbsence(userId: string, message: string) {
    const result = this.results.find((r) =>
      r.members.some((m) => (m.userId as IUser)._id.toString() === userId),
    );
    if (result) {
      const member = result.members.find(
        (m) => (m.userId as IUser)._id.toString() === userId,
      );
      if (member) {
        member.absence = true;
        member.memo = message;
        //불참 시간으로 사용
        member.arrived = new Date();
      }
    }
  }
  public addReviewers(studyId: string, reviewer: string) {
    const result = this.results.find(
      (result) => result.placeId.toString() === studyId,
    );

    result.reviewers.push(reviewer);
  }
  setParticipate(placeId: string, participateData: Partial<Participation>) {
    const newResult = this.results.find(
      (r) => (r.placeId as any)._id.toString() === placeId,
    );
    if (!newResult) {
      throw new Error(`Place with ID ${placeId} not found in results.`);
    }

    const userExists = newResult.members.some(
      (p) =>
        (p.userId as IUser)._id.toString() ===
        participateData.userId.toString(),
    );

    const findResult = this.results.find(
      (result) => (result.placeId as any)._id.toString() === placeId.toString(),
    );

    if (!userExists) {
      findResult.members.push(
        new Participation({
          userId: participateData.userId,
          latitude: participateData.latitude,
          longitude: participateData.longitude,
          start: participateData.start,
          end: participateData.end,
          locationDetail: participateData.locationDetail || '',
          comment: participateData?.comment
            ? new VoteComment(participateData.comment)
            : null,
          isBeforeResult: false,
          eps: participateData.eps,
        }),
      );
    }
  }

  updateMemo(userId: string, memo: string) {
    const participant = this.participations.find(
      (p) => p.userId.toString() === userId.toString(),
    );
    if (!participant) {
      throw new Error(
        `Participant with ID ${userId} not found in participations.`,
      );
    }
    participant.comment = new VoteComment({ comment: memo });
  }

  updateArriveMemo(userId: string, memo: string) {
    const result = this.results.find((r) =>
      r.members.some(
        (m) =>
          (m.userId as IUser)?._id?.toString() === userId.toString() ||
          m.userId.toString() === userId.toString(),
      ),
    );
    if (!result) {
      throw new Error(
        `Participant with ID ${userId} not found in participations.`,
      );
    }
    const member = result.members.find(
      (m) =>
        (m.userId as IUser)?._id?.toString() === userId.toString() ||
        m.userId.toString() === userId.toString(),
    );
    if (!member) {
      throw new Error(`Member with ID ${userId} not found in result members.`);
    }
    member.memo = memo;
  }

  setOrUpdateParticipation(newParticipation: Participation) {
    const idx = this.participations.findIndex(
      (p) =>
        (p.userId as IUser)?._id?.toString() ===
        newParticipation.userId.toString(),
    );
    if (idx !== -1) {
      this.participations[idx] = newParticipation;
    } else {
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
