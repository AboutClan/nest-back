import { getScheduledAtOnDate } from 'src/utils/Date';
import { Participation, ParticipationProps } from './Vote2Participation';
import { Result, ResultProps } from './Vote2Result';
import { VoteComment } from './Vote2VoteComment';
/** Vote2.setAbsence()의 처리 결과. 호출부가 포인트 차감 여부를 판단하는 데 쓴다. */
export type AbsenceResult = 'ok' | 'not-member' | 'already-absent';

/** Vote2.setArrive()의 처리 결과. 중복 출석으로 포인트가 두 번 나가지 않게 한다. */
export type ArriveResult = 'ok' | 'not-member' | 'already-arrived';

/**
 * 참조 필드(userId·placeId)에서 id 문자열만 꺼낸다.
 *
 * Vote2는 populate한 문서(User·Place 객체)와 안 한 문서(ObjectId)를 함께 다룬다.
 * populate된 객체를 그대로 비교하거나 toString()하면 어떤 id와도 일치하지 않아
 * 비교가 조용히 실패하고, 반대로 ObjectId에서 _id를 꺼내려 하면 undefined가 나와 터진다.
 */
export const toId = (userId: unknown): string => {
  if (!userId) return '';

  const populatedId = (userId as { _id?: unknown })?._id;
  return String(populatedId ?? userId);
};

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
    this.participations = props.participations
      .filter((p) => p.userId)
      .map((p) => new Participation(p));
    this.results = props.results.map((r) => new Result(r));
  }

  /** 확정된 스터디에서 내 멤버 항목. 없으면 undefined. */
  findResultMember(userId: string) {
    for (const result of this.results) {
      const member = result.members.find(
        (m) => toId(m.userId) === toId(userId),
      );
      if (member) return member;
    }
    return undefined;
  }

  /**
   * start/end에 담긴 시:분을 이 Vote2의 날짜(KST) 기준 실제 시각으로 맞춘다.
   *
   * 저장된 날짜는 믿을 수 없다 — 주간 신청(dateArr)은 프론트가 시각을
   * "신청한 날짜 + 선택 시간"으로 만들어 보내기 때문에, 미래 날짜 신청에는
   * 스터디 날짜가 아니라 신청한 날짜가 박혀 있다.
   */
  getScheduledAt(raw: string): Date | null {
    return getScheduledAtOnDate(this.date, raw);
  }

  /**
   * 저장 전에 start/end를 이 Vote2의 날짜로 다시 앵커링한다.
   *
   * 클라이언트가 보내는 값에는 "신청한 날짜"가 박혀 있다 — 주간 신청(dateArr)은
   * 선택한 모든 날짜에 같은 타임스탬프를 그대로 쓰기 때문이다. 저장 시점에 맞춰 두지
   * 않으면 member.start를 평범한 타임스탬프로 읽는 코드가 전부 어긋난다.
   *
   * 신청·시간변경 룰렛 범위가 10:00~23:00이라 여기 들어오는 start/end는 자정을 넘지
   * 않는다(doAlgorithm의 시간 겹침 계산도 같은 가정을 쓴다). 출석 시 신고하는 예상
   * 종료 시각은 자정을 넘을 수 있으므로 앵커링하지 않는다 — setArrive 참고.
   */
  private anchorTime<T extends string | undefined>(raw: T): T {
    if (!raw) return raw;

    return (this.getScheduledAt(raw)?.toISOString() ?? raw) as T;
  }

  /** 결과 발표 전에 신청해 둔 사람인지. 출석 보상 등급이 여기서 갈린다. */
  isVoteBefore(userId: string) {
    const participant = this.participations.find(
      (p) => toId(p.userId) === toId(userId),
    );
    if (!participant) {
      return false;
    }
    return participant.isBeforeResult;
  }

  /** 예정 시작 시각보다 60분 이상 늦게 출석했는지. */
  isLate(userId: string) {
    const member = this.findResultMember(userId);
    if (!member?.arrived || !member?.start) {
      return false;
    }

    const scheduledStart = this.getScheduledAt(member.start);
    if (!scheduledStart) {
      return false;
    }

    const diffMinutes =
      (new Date(member.arrived).getTime() - scheduledStart.getTime()) /
      (60 * 1000);

    return diffMinutes >= 60;
  }

  /**
   * 예정 시작 시각이 지났는데 출석·불참 처리가 아직 없는 멤버의 userId 목록.
   * 출석 누락 알림(16:00·20:00)이 쓴다.
   */
  getUnarrivedUserIdsAfterStart(now = new Date()): string[] {
    const userIds: string[] = [];

    for (const result of this.results) {
      for (const member of result.members) {
        if (member.arrived || member.absence) continue;

        const scheduledStart = this.getScheduledAt(member.start);
        if (scheduledStart && scheduledStart < now) {
          userIds.push(toId(member.userId));
        }
      }
    }

    return userIds.filter(Boolean);
  }

  updateParticipation(userId: string, start: string, end: string) {
    this.participations.forEach((par) => {
      if (toId(par.userId) === toId(userId)) {
        par.start = this.anchorTime(start);
        par.end = this.anchorTime(end);
      }
    });
  }
  updateResult(userId: string, start: string, end: string) {
    this.results.forEach((result) => {
      result.members.forEach((member) => {
        if (toId(member.userId) === toId(userId)) {
          member.start = this.anchorTime(start);
          member.end = this.anchorTime(end);
        }
      });
    });
  }

  setComment(userId: string, comment: string) {
    this.results.forEach((result) => {
      result.members.forEach((member) => {
        if (toId(member.userId) === toId(userId)) {
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
      this.participations.some((p) => toId(p.userId) === toId(userId))
    ) {
      this.participations = this.participations.filter(
        (p) => toId(p.userId) !== toId(userId),
      );
      return true;
    } else {
      return false;
    }
  }

  /**
   * 출석 처리. 실제 도착 시각은 arrived에만 기록한다.
   *
   * 예전에는 member.start를 출석 시각으로 덮어썼다. 그러면 (1) 신청한 시작 시각이
   * 사라져 시간표가 왜곡되고, (2) 직후에 계산하는 isLate가 arrived - start = 0이 되어
   * 지각 판정이 영구히 false가 된다.
   *
   * end는 앵커링하지 않는다. 출석 화면의 예상 종료 시각은 출석 시점부터 12시간까지
   * 고를 수 있어 자정을 넘을 수 있고(23시 출석 → 익일 02시), 이때 스터디 날짜로
   * 되돌리면 종료가 시작보다 앞서 버린다. 클라이언트가 이미 올바른 절대 시각을 보낸다.
   */
  setArrive(
    userId: string,
    memo: any,
    end: string,
    imageUrl?: string,
  ): ArriveResult {
    const member = this.findResultMember(userId);
    if (!member) return 'not-member';
    if (member.arrived) return 'already-arrived';

    member.arrived = new Date();
    memo && (member.memo = memo);
    end && (member.end = end);
    imageUrl && (member.imageUrl = imageUrl);
    return 'ok';
  }

  /**
   * placeId로 결과(조)를 찾는다.
   *
   * 예전에는 placeId를 Place로 단정해 _id를 꺼냈기 때문에 populate된 문서만 처리됐다.
   * 유일한 호출부(changeStudyPlace)는 populate하지 않은 문서를 넘기므로,
   * ObjectId에 없는 _id를 꺼내다 항상 TypeError가 났다(= 장소 변경 상시 실패).
   */
  findStudyPlace(placeId: string) {
    return this.results.find((r) => toId(r.placeId) === toId(placeId));
  }

  // 호출부가 포인트 차감 여부를 판단할 수 있도록 처리 결과를 돌려준다.
  // (예전에는 void라 확정 스터디가 없어도, 이미 불참 처리됐어도 차감이 그대로 나갔다.)
  setAbsence(userId: string, message: string): AbsenceResult {
    const member = this.findResultMember(userId);
    if (!member) return 'not-member';
    if (member.absence) return 'already-absent';

    member.absence = true;
    member.memo = message;
    //불참 시간으로 사용
    member.arrived = new Date();
    return 'ok';
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
      (p) => toId(p.userId) === toId(participateData.userId),
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
          start: this.anchorTime(participateData.start),
          end: this.anchorTime(participateData.end),
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
      (p) => toId(p.userId) === toId(userId),
    );
    if (!participant) {
      throw new Error(
        `Participant with ID ${userId} not found in participations.`,
      );
    }
    participant.comment = new VoteComment({ comment: memo });
  }

  updateArriveMemo(userId: string, memo: string) {
    const member = this.findResultMember(userId);
    if (!member) {
      throw new Error(`Member with ID ${userId} not found in result members.`);
    }
    member.memo = memo;
  }

  setOrUpdateParticipation(newParticipation: Participation) {
    // dateArr는 선택한 모든 날짜에 같은 start/end를 보내므로 여기서 이 문서의
    // 날짜로 맞춰 저장한다. 안 하면 신청한 날짜가 그대로 박힌다.
    newParticipation.start = this.anchorTime(newParticipation.start);
    newParticipation.end = this.anchorTime(newParticipation.end);

    const idx = this.participations.findIndex(
      (p) => toId(p.userId) === toId(newParticipation.userId),
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
