import { Inject } from '@nestjs/common';
import dayjs from 'dayjs';
import { CONST } from 'src/Constants/CONSTANTS';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { AppError } from 'src/errors/AppError';
import { PlaceRepository } from 'src/MSA/Place/core/interfaces/place.repository.interface';
import RealtimeService from 'src/MSA/Study/core/services/realtime.service';
import { UserService } from 'src/MSA/User/core/services/user.service';
import { IUser } from 'src/MSA/User/entity/user.entity';
import { RequestContext } from 'src/request-context';
import { ClusterUtils } from 'src/utils/ClusterUtils';
import { DateUtils, getStudyMinutesUntil } from 'src/utils/Date';
import { IPLACE_REPOSITORY, IVOTE2_REPOSITORY } from 'src/utils/di.tokens';
import ImageService from '../../../../routes/imagez/image.service';
import { FcmService } from '../../../Notification/core/services/fcm.service';
import {
  CreateNewVoteDTO,
  CreateParticipateDTO,
  DateTimeDTO,
} from '../../dtos/vote2.dto';
import {
  IAnchor,
  IMember,
  IParticipation,
  IResult,
} from '../../entity/vote2.entity';
import { Realtime } from '../domain/Realtime/Realtime';
import { toId } from '../domain/Vote2/Vote2';
import { Result } from '../domain/Vote2/Vote2Result';
import { IVote2Repository } from '../interfaces/Vote2Repository.interface';
// 유저가 지정할 수 있는 매칭 기준점 최대 개수. 프론트 UI와 맞춰져 있다.
const MAX_ANCHORS = 2;

export class Vote2Service {
  constructor(
    @Inject(IVOTE2_REPOSITORY)
    private readonly Vote2Repository: IVote2Repository,
    @Inject(IPLACE_REPOSITORY)
    private readonly PlaceRepository: PlaceRepository,
    private readonly RealtimeService: RealtimeService,
    private readonly userServiceInstance: UserService,
    private readonly fcmServiceInstance: FcmService,
    private readonly imageServiceInstance: ImageService,
  ) {}

  formatMember(member: IMember) {
    const form = {
      user: member.userId,
      time: {
        start: member.start,
        end: member.end,
      },
    };
    return form;
  }

  formatResultMember(member: IMember) {
    const form = {
      user: member.userId,
      time: {
        start: member.start,
        end: member.end,
      },
      attendance: {
        time: member?.arrived,
        memo: member?.memo,
        attendanceImage: member?.imageUrl,
        type: member?.absence ? 'absenced' : member.arrived ? 'arrived' : null,
      },
      comment: member.comment,
    };

    return form;
  }

  async getWeekData() {
    const dates = DateUtils.getWeekDate();

    // 장소 목록은 날짜와 무관하므로 한 번만 조회해 모든 날짜가 공유한다.
    const places = await this.PlaceRepository.findForVote2();

    const rawData = await Promise.all(
      dates.map(async (date, idx) => {
        // 오늘(idx 0)은 시간에 따라 갈린다. 9시 전에는 아직 매칭 전이므로
        // getBeforeVoteInfo가 participations를 포함해 내려줘야 한다.
        // 이게 없으면 프론트가 "오늘 내 신청"을 알 수 없어, 신청 목록을
        // 다시 제출할 때 오늘 신청이 삭제된다(setVoteWithArr는 전체 교체다).
        if (idx === 0) {
          return await this.getVoteInfo(date, places);
        }
        const before = await this.getBeforeVoteInfo(date, places);
        // const realtime = await this.RealtimeService.getTodayData(date);
        return { ...before };
      }),
    );

    return dates.map((date, idx) => ({
      date,
      ...rawData[idx],
      ...(rawData[idx].realTimes && {
        realTimes: rawData[idx].realTimes.userList,
      }),
    }));
  }
  async getLastWeekData(idx: string) {
    const dates = Array.from({ length: 7 }, (_, i) =>
      dayjs()
        .subtract(i + 1 + 7 * (+idx - 1), 'day')
        .format('YYYY-MM-DD'),
    );

    const rawData = await Promise.all(
      dates.map(async (date, idx) => {
        return await this.getAfterVoteInfo(date);
      }),
    );

    return dates.map((date, idx) => ({
      date,
      ...rawData[idx],
      ...(rawData[idx].realTimes && {
        realTimes: rawData[idx].realTimes.userList,
      }),
    }));
  }
  async getMine() {
    const token = RequestContext.getDecodedToken();

    const voteData = await this.Vote2Repository.findMineById(token.id);
    return voteData;
  }

  // 스터디 크루 멤버별 최근 한달 간 투표/참여 통계
  // vote2는 날짜(document)별로 participations(투표만 한 유저), results.members(스터디가 열려 실제 참여한 유저)를 담고 있다.
  async getCrewStudyStats(userIds: string[], days = 30) {
    // 기준일을 오늘이 아니라 오늘+6일로 잡는다.
    // 예) 오늘이 9/2면 기준일은 9/8, 최근 한달은 8/9~9/8.
    const referenceDay = dayjs().add(6, 'day');
    const endDay = referenceDay.format('YYYY-MM-DD');
    const startDay = referenceDay.subtract(days, 'day').format('YYYY-MM-DD');

    const docs = await this.Vote2Repository.getCrewStatsRaw(
      userIds,
      startDay,
      endDay,
    );

    type Stat = {
      lastVoteDate: string | null;
      lastParticipationDate: string | null;
      voteCount: number;
      participationCount: number;
    };

    const statsMap = new Map<string, Stat>(
      userIds.map((userId) => [
        userId,
        {
          lastVoteDate: null,
          lastParticipationDate: null,
          voteCount: 0,
          participationCount: 0,
        },
      ]),
    );

    const sortedDocs = [...docs].sort((a, b) => (a.date > b.date ? 1 : -1));

    for (const doc of sortedDocs) {
      for (const participation of doc.participations || []) {
        const uid = participation.userId?.toString();
        const stat = uid && statsMap.get(uid);
        if (!stat) continue;
        stat.voteCount += 1;
        stat.lastVoteDate = doc.date;
      }
      for (const result of doc.results || []) {
        for (const member of result.members || []) {
          const uid = member.userId?.toString();
          const stat = uid && statsMap.get(uid);
          if (!stat) continue;
          stat.participationCount += 1;
          stat.lastParticipationDate = doc.date;
        }
      }
    }

    return userIds.map((userId) => ({ userId, ...statsMap.get(userId) }));
  }

  async getVoteInfo(
    date: string,
    injectedPlaces?: Awaited<ReturnType<PlaceRepository['findForVote2']>>,
  ) {
    // const now = new Date(date);
    // const targetTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    const koreaTime = DateUtils.getKoreaToday();
    const hour = koreaTime.getHours();
    const targetTime = DateUtils.getKoreaDate(date);

    const todayStr = koreaTime.toISOString().split('T')[0];
    const targetStr = targetTime.toISOString().split('T')[0];

    // 과거
    if (targetStr < todayStr) {
      return this.getAfterVoteInfo(date);
    }
    // 오늘
    if (targetStr === todayStr && hour >= 9) {
      return this.getAfterVoteInfo(date);
    }

    return this.getBeforeVoteInfo(date, injectedPlaces);
  }

  private async getBeforeVoteInfo(
    date: string,
    injectedPlaces?: Awaited<ReturnType<PlaceRepository['findForVote2']>>,
  ) {
    const participations: IParticipation[] =
      await this.Vote2Repository.findParticipationsByDate(date);

    // 확정(09:00)과 같은 기준으로 돌린다. 예전에는 3명 기준이라 미리보기에 보였던 조가
    // 확정에서 인원 미달로 사라졌다 — 미리보기의 목적은 "이대로 가면 어떻게 되는지"이므로
    // 기준이 달라선 안 된다.
    const { voteResults } = await this.doAlgorithm(
      participations,
      undefined,
      injectedPlaces,
    );

    const resultPlaceIds = voteResults.map((result) => result.placeId);

    //todo: {placeId, members}로 오도록
    const resultPlaces = await this.PlaceRepository.findByIds(
      resultPlaceIds as string[],
    );
    const realtimeData = await this.RealtimeService.getTodayDataWithPlace(date);

    const m = new Map<string, any>();
    resultPlaces.forEach((place) => m.set(place._id.toString(), place));

    const results = voteResults.map((result) => ({
      members: result.members.map((member) => this.formatMember(member)),
      place: m.get(result.placeId.toString()),
      center: result.center,
    }));

    return {
      participations: participations.map((par) => {
        const { userId, ...rest } = (par as any).toObject();
        return {
          ...rest,
          user: userId,
        };
      }),
      results,
      status: 'expected',
      realTimes: realtimeData
        ? {
            ...realtimeData,
            userList: realtimeData.userList.map((user) =>
              Realtime.formatRealtime(user),
            ),
          }
        : null,
    };
  }

  //todo: locationDetail 등록해야함
  private async getAfterVoteInfo(date: string) {
    const voteData = await this.Vote2Repository.findByDate(date);
    const realtimeData = await this.RealtimeService.getTodayDataWithPlace(date);
    //results

    const participations = voteData?.participations?.filter((p) => p?.userId);

    const unmatchedUsers = [];

    // toId로 비교해야 한다. 양쪽 userId가 모두 populate된 User 문서인데다
    // results.members와 participations의 populate select가 서로 달라(전자는 studyIntroduce,
    // 후자는 isLocationSharingDenided studyIntroduce), toString() 결과가 절대 일치하지 않았다.
    // 그래서 그날 신청자 전원이 unmatched로 내려가 매칭 성공자에게도 실패 배너가 떴다.
    const resultMembers = voteData.results.flatMap((result) =>
      result.members.filter((p) => p?.userId).map((member) => toId(member.userId)),
    );

    participations?.forEach((par) => {
      if (!resultMembers.includes(toId(par.userId))) {
        unmatchedUsers.push(par.userId);
      }
    });

    return {
      results: voteData.results.map((result) => ({
        place: result.placeId,
        members: result.members
          .filter((m) => !!m.userId)
          .map((member: any) => this.formatResultMember(member)),
      })),
      status: 'open',
      realTimes: realtimeData
        ? {
            ...realtimeData,
            userList: realtimeData.userList.map((user) =>
              Realtime.formatRealtime(user),
            ),
          }
        : null,
      unmatchedUsers,
    };
  }

  /**
   * 당일 불참 벌금.
   *
   * 결과가 확정되는 09:00에 1,000P에서 시작해, 한 시간이 지날 때마다 100P씩 늘고
   * 2,000P에서 멈춘다. 늦게 알릴수록 같은 조원들이 대응할 시간이 줄기 때문이다.
   * 09:00 이전에는 아직 확정된 스터디가 없으므로(= setAbsence가 not-member로 거절)
   * 기본값 1,000P가 그대로 쓰인다.
   */
  static getStudyAbsencePoint(now = dayjs().tz('Asia/Seoul')) {
    const STUDY_RESULT_HOUR = 9;
    const hoursSinceResult = Math.max(0, now.hour() - STUDY_RESULT_HOUR);

    return Math.max(
      CONST.POINT.STUDY_ABSENCE_MAX,
      CONST.POINT.STUDY_ABSENCE_BASE +
        hoursSinceResult * CONST.POINT.STUDY_ABSENCE_HOURLY,
    );
  }

  /**
   * 기준점을 항상 배열로 만든다. anchors를 안 보내는 레거시 호출(초대·장소변경·취소)은
   * latitude/longitude 한 점짜리 배열이 된다.
   *
   * 같은 유저의 기준점이 서로 너무 가까우면(= 한쪽이 다른 쪽 범위에 사실상 포함) 하나로 접는다.
   * 접지 않으면 그 유저가 후보 목록에 두 번 잡혀 인원이 부풀 수 있다.
   */
  static normalizeAnchors(
    anchors: IAnchor[] | undefined,
    latitude: number | string,
    longitude: number | string,
    locationDetail?: string,
  ): IAnchor[] {
    const toNum = (v: number | string) => (typeof v === 'string' ? +v : v);

    const raw = (
      anchors?.length ? anchors : [{ latitude, longitude, locationDetail }]
    )
      .map((a) => ({
        latitude: toNum(a.latitude),
        longitude: toNum(a.longitude),
        locationDetail: a.locationDetail,
      }))
      .filter(
        (a) => Number.isFinite(a.latitude) && Number.isFinite(a.longitude),
      );

    const MERGE_THRESHOLD_KM = 0.5;
    const merged: IAnchor[] = [];

    for (const a of raw) {
      const isDuplicate = merged.some(
        (b) =>
          ClusterUtils.haversineDistance(
            a.latitude,
            a.longitude,
            b.latitude,
            b.longitude,
          ) < MERGE_THRESHOLD_KM,
      );
      if (!isDuplicate) merged.push(a);
    }

    return merged.slice(0, MAX_ANCHORS);
  }

  async setVote(
    date: string,
    createVote: CreateNewVoteDTO,
    notifyInvite = false,
  ) {
    const token = RequestContext.getDecodedToken();

    const vote2 = await this.Vote2Repository.findByDate(date);

    const {
      latitude,
      longitude,
      start,
      end,
      locationDetail,
      userId,
      eps,
      anchors,
    } = createVote;

    const voteData: any = {};

    voteData.userId = userId ? userId : token.id;

    // null이 아닌 경우만 필드에 추가
    if (vote2.results.length === undefined || vote2.results.length === 0) {
      voteData.isBeforeResult = true;
    }
    if (latitude !== null) voteData.latitude = latitude;
    if (longitude !== null) voteData.longitude = longitude;
    if (start !== null) voteData.start = start;
    if (end !== null) voteData.end = end;
    if (locationDetail !== null) voteData.locationDetail = locationDetail;
    if (eps !== null) voteData.eps = eps;

    // anchors를 안 보내는 레거시 호출은 latitude/longitude 한 점으로 정규화한다.
    voteData.anchors = Vote2Service.normalizeAnchors(
      anchors,
      latitude,
      longitude,
      locationDetail,
    );

    vote2.setOrUpdateParticipation(voteData);

    await this.Vote2Repository.save(vote2);

    // 초대는 다른 사람이 대신 신청시키는 것이라, 알리지 않으면 초대받은 사람이
    // 신청된 사실 자체를 알 수 없다. 주간 초대(setVoteWithArr)는 날짜마다 여기를
    // 지나므로 푸시를 한 번만 보내려고 호출부에서 플래그로 제어한다.
    if (notifyInvite && createVote?.userId) {
      await this.fcmServiceInstance.sendNotificationToXWithId(
        createVote.userId,
        `스터디 초대 알림 ${dayjs(date).format('(M월 D일)')}`,
        `[${locationDetail}] 스터디에 초대되었어요!`,
        `/study/participations/${date}?type=participations`,
      );
    }

    return;
  }

  async setVoteWithArr(
    dates: string[],
    createVote: CreateNewVoteDTO,
    type?: 'invite',
    dateTimes?: DateTimeDTO[],
  ) {
    const thisWeek = DateUtils.getWeekDate();

    // 날짜별 시간이 오면 그 날짜만 해당 값을 쓴다. 예전에는 선택한 모든 날짜에 공용
    // start/end를 그대로 써서, 한 날짜의 시간을 정하면 이미 신청해 둔 다른 날짜의
    // 시간까지 조용히 덮였다(사용자에게 아무 표시도 없었다).
    const timeByDate = new Map(
      (dateTimes ?? []).map((entry) => [entry.date, entry]),
    );

    for (const date of thisWeek) {
      if (dates.includes(date)) {
        const override = timeByDate.get(date);

        await this.setVote(
          date,
          override
            ? { ...createVote, start: override.start, end: override.end }
            : createVote,
        );
      } else if (type !== 'invite') {
        await this.deleteVote(date);
      }
    }

    // 초대는 날짜가 여러 개여도 푸시는 한 번만 보낸다.
    if (type === 'invite' && createVote?.userId && dates.length) {
      const dateText = dates
        .map((date) => dayjs(date).format('M월 D일(ddd)'))
        .join(', ');

      await this.fcmServiceInstance.sendNotificationToXWithId(
        createVote.userId,
        '스터디 초대',
        `${dateText} 스터디에 초대되었어요!`,
        `/study/participations/${dates[0]}?type=participations`,
      );
    }
  }

  async deleteVote(date: string) {
    const token = RequestContext.getDecodedToken();

    const vote2 = await this.Vote2Repository.findByDateWithoutPopulate(date);

    const isRemoved = vote2.removeParticipationByUserId(token.id);

    if (!isRemoved) {
      return;
    }
    await this.Vote2Repository.save(vote2);
  }
  async deleteVoteWeek(date: string) {
    const token = RequestContext.getDecodedToken();

    const vote2 = await this.Vote2Repository.findByDate(date);

    vote2.removeParticipationByUserId(token.id);

    await this.Vote2Repository.save(vote2);
  }

  private async doAlgorithm(
    participations2: IParticipation[],
    defaultStandardCnt?: number,
    // 주간 조회는 날짜마다 이 함수를 돌린다. 장소 목록은 날짜와 무관하므로
    // 호출부에서 한 번만 조회해 넘기면 중복 쿼리를 없앨 수 있다.
    injectedPlaces?: Awaited<ReturnType<PlaceRepository['findForVote2']>>,
  ) {
    const MIN_OVERLAP_MINUTES = 60;
    const INITIAL_MAX_GROUP_SIZE = 6; // ✅ 처음 그룹 만들 때 cap
    const FINAL_MAX_GROUP_SIZE = 8; // ✅ 남은 인원 채울 때 cap
    // 확정 매칭은 목표 5명, 미달 시 4명까지만 축소한다.
    const standardCnt = defaultStandardCnt || 5;
    // 축소 시도 인원. 어떤 경우에도 3명 미만 그룹은 만들지 않는다.
    // 미리보기(getBeforeVoteInfo)도 같은 기준으로 돌리므로 defaultStandardCnt를 넘기지 않는다.
    const MIN_GROUP_SIZE = 3;
    const reducedCnt = Math.max(standardCnt - 1, MIN_GROUP_SIZE);

    const participations = participations2?.filter((p) => p?.userId);

    const toMinutesOfDay = (s: string) => {
      // 1) 'HH:mm'만 들어오는 경우
      if (/^\d{2}:\d{2}$/.test(s)) {
        const [h, m] = s.split(':').map(Number);
        return h * 60 + m; // 0~1439
      }
      // 2) ISO 포함 등 기타 문자열은 Date로 파싱 후 KST 시:분만 사용
      const d = new Date(s);
      const minsUTC = d.getUTCHours() * 60 + d.getUTCMinutes();
      return (minsUTC + 9 * 60) % (24 * 60);
    };

    // 겹치는 분 계산 (날짜 무시, 같은 날의 시계만 비교)
    function overlapMinutes(
      a: { start: string; end: string },
      b: { start: string; end: string },
    ) {
      const as = toMinutesOfDay(a.start);
      const ae = toMinutesOfDay(a.end);
      const bs = toMinutesOfDay(b.start);
      const be = toMinutesOfDay(b.end);

      // 자정 안 넘는다고 가정 (end >= start)
      const overlap = Math.min(ae, be) - Math.max(as, bs);
      return Math.max(0, overlap);
    }

    // “그룹 안의 누구든 한 명과 MIN_OVERLAP_MINUTES(60분) 이상 겹치면 합류 OK”
    function canJoinByTime(
      group: Array<{ start: string; end: string }>,
      c: { start: string; end: string },
    ) {
      return group.some((m) => overlapMinutes(m, c) >= MIN_OVERLAP_MINUTES);
    }

    // 참여자 1명당 항목 1개를 유지한다. 기준점이 2개여도 항목을 늘리지 않으므로
    // 후보 인원 집계·중복 배정 문제가 생기지 않는다.
    const coords = participations?.map((par, idx) => ({
      user: par.userId,
      userId: (par.userId as unknown as IUser)._id.toString(),
      lat: par.latitude,
      lon: par.longitude,
      anchors: Vote2Service.normalizeAnchors(
        par.anchors,
        par.latitude,
        par.longitude,
        par.locationDetail,
      ),
      eps: par?.eps + 0.1 || 3.1,
      start: par.start,
      end: par.end,
      isBeforeResult: par.isBeforeResult,
      order: idx,
    }));

    /** 기준점 중 가장 가까운 것까지의 거리. 하나라도 범위에 들면 참여 가능하다. */
    const distToPlace = (
      coord: { anchors: IAnchor[] },
      placeLat: number,
      placeLon: number,
    ) => ClusterUtils.minDistanceToAnchors(coord.anchors, placeLat, placeLon);

    const places = injectedPlaces ?? (await this.PlaceRepository.findForVote2());

    const voteResults: IResult[] = [];
    const clusteredParticipantIds = new Set<string>();
    const usedPlaceIds = new Set<string>();

    // ---------- 사전 계산: 각 참여자가 도달 가능한 장소 수 ----------
    const reachableCount = new Map<string, number>();
    for (const coord of coords) {
      const cnt = places.filter(
        (pl) =>
          distToPlace(coord, pl.location.latitude, pl.location.longitude) <=
          coord.eps,
      ).length;
      reachableCount.set(coord.userId, Math.max(cnt, 1));
    }

    // ---------- 사전 계산: 완전히 동일한 기준점 번들 ----------
    // 기준점 "집합"이 같은 참여자는 반드시 같은 그룹에 배정한다.
    // 순서에는 의미가 없으므로 정렬해서 키를 만든다.
    const userToCoordKey = new Map<string, string>();
    for (const coord of coords) {
      const key = coord.anchors
        .map((a) => `${a.latitude},${a.longitude}`)
        .sort()
        .join('|');
      userToCoordKey.set(coord.userId, key);
    }

    type CandItem = {
      user: IUser;
      userId: string;
      dist: number;
      start: string;
      end: string;
      isBeforeResult: boolean;
      lat: number;
      lon: number;
      order: number;
    };

    /** pool에서 좌표 번들 순서로 반환 (같은 좌표는 묶어서 처리) */
    const toBundles = (pool: CandItem[]): CandItem[][] => {
      const seen = new Set<string>();
      const bundles: CandItem[][] = [];
      for (const cand of pool) {
        const key = userToCoordKey.get(cand.userId)!;
        if (seen.has(key)) continue;
        seen.add(key);
        bundles.push(pool.filter((p) => userToCoordKey.get(p.userId) === key));
      }
      return bundles;
    };

    // ---------- 장소 정렬: 독점 참여자(갈 곳이 1개뿐) 많은 곳 우선 ----------
    const getCandidatesForPlace = (pl: (typeof places)[0]) =>
      coords.filter(
        (coord) =>
          distToPlace(coord, pl.location.latitude, pl.location.longitude) <=
          coord.eps,
      );

    const getPlaceTotalScore = (place: (typeof places)[0]): number => {
      const ratings: any[] = Array.isArray(place.ratings) ? place.ratings : [];
      const total = ratings.reduce(
        (acc, cur) =>
          acc +
          (cur.mood ?? 0) +
          (cur.table ?? cur.power ?? 0) +
          (cur.space ?? 0) +
          (cur.etc ?? 0),
        0,
      );
      return ratings.length > 3
        ? total / (ratings.length * 4)
        : ((place as any).rating ?? 0);
    };

    const sortedPlaces = [...places].sort((a, b) => {
      const aCands = getCandidatesForPlace(a);
      const bCands = getCandidatesForPlace(b);
      const aIsMain = (a as any).status === 'main' ? 1 : 0;
      const bIsMain = (b as any).status === 'main' ? 1 : 0;
      return (
        bIsMain - aIsMain || // 1. status = 'main' 우선
        bCands.length - aCands.length || // 2. 참여 인원 많은 곳
        getPlaceTotalScore(b) - getPlaceTotalScore(a) // 3. totalScore
      );
    });

    // 후보 목록 캐싱 (장소별 재사용)
    const candidateCache = new Map<
      string,
      Array<{
        user: IUser;
        userId: string;
        dist: number;
        start: string;
        end: string;
        isBeforeResult: boolean;
        lat: number;
        lon: number;
        order: number;
      }>
    >();
    const getSortedCandidates = (place: (typeof places)[0]) => {
      const placeId = place._id.toString();
      if (!candidateCache.has(placeId)) {
        const candidates = coords
          .filter(
            (coord) =>
              distToPlace(
                coord,
                place.location.latitude,
                place.location.longitude,
              ) <= coord.eps,
          )
          .map((coord) => ({
            user: coord.user as IUser,
            userId: coord.userId,
            dist: distToPlace(
              coord,
              place.location.latitude,
              place.location.longitude,
            ),
            start: coord.start,
            end: coord.end,
            isBeforeResult: coord.isBeforeResult,
            lat: coord.lat,
            lon: coord.lon,
            order: coord.order,
          }))
          .sort((a, b) => {
            const aR = reachableCount.get(a.userId) ?? 1;
            const bR = reachableCount.get(b.userId) ?? 1;
            if (aR !== bR) return aR - bR; // 선택지 적은 사람 우선
            return a.dist - b.dist || a.order - b.order;
          });
        candidateCache.set(placeId, candidates);
      }
      return candidateCache.get(placeId)!;
    };

    // ---------- 1a) 형성 패스: 번들 단위로 최소 인원 확보 → 그룹 수 최대화 ----------
    for (const place of sortedPlaces) {
      const placeId = place._id.toString();
      if (usedPlaceIds.has(placeId)) continue;

      const formMinimalGroup = (targetSize: number) => {
        if (usedPlaceIds.has(placeId)) return;
        const pool = getSortedCandidates(place).filter(
          (c) => !clusteredParticipantIds.has(c.userId),
        );
        if (pool.length < targetSize) return;

        const bundles = toBundles(pool);

        // 시간대가 맞는 사람끼리만 묶는다.
        // 첫 번들을 시드로 삼아 쌓되, 시드와 시간이 안 맞아 인원을 못 채우면
        // 다음 번들을 시드로 다시 시도한다. 이게 없으면 소수파 시간대가 먼저 잡혀
        // 다수파로 만들 수 있었던 그룹까지 통째로 놓친다.
        const tryFormFromSeed = (seedIdx: number): CandItem[] | null => {
          const members: CandItem[] = [];

          for (let i = seedIdx; i < bundles.length; i++) {
            if (members.length >= targetSize) break;

            const bundle = bundles[i];
            // 번들은 통째로 넣거나 아예 넣지 않는다(같은 기준점 참여자는 함께 배정).
            if (
              members.length &&
              !canJoinByTime(members as any, {
                start: bundle[0].start,
                end: bundle[0].end,
              })
            ) {
              continue;
            }

            for (const p of bundle) members.push(p);
          }

          return members.length >= targetSize ? members : null;
        };

        let groupMembers: CandItem[] | null = null;
        for (let seed = 0; seed < bundles.length; seed++) {
          groupMembers = tryFormFromSeed(seed);
          if (groupMembers) break;
        }

        if (!groupMembers) return;

        voteResults.push({
          placeId,
          members: groupMembers.map((g) => ({
            userId: g.user,
            start: g.start,
            end: g.end,
            isBeforeResult: g.isBeforeResult,
          })) as any,
          center: {
            lat: place.location.latitude,
            lon: place.location.longitude,
          },
        });
        usedPlaceIds.add(placeId);
        groupMembers.forEach((g) => clusteredParticipantIds.add(g.userId));
      };

      formMinimalGroup(standardCnt);
      if (reducedCnt < standardCnt) formMinimalGroup(reducedCnt);
    }

    // ---------- 1b) 채우기 패스: 모든 그룹 확보 후 번들 단위로 6명까지 보충 ----------
    for (const result of voteResults) {
      if (result.members.length >= INITIAL_MAX_GROUP_SIZE) continue;
      const place = places.find((p) => p._id.toString() === result.placeId);
      if (!place) continue;

      const pool = getSortedCandidates(place).filter(
        (c) => !clusteredParticipantIds.has(c.userId),
      );

      for (const bundle of toBundles(pool)) {
        if (result.members.length >= INITIAL_MAX_GROUP_SIZE) break;
        // 번들 전체를 추가해도 cap을 넘지 않는 경우, 또는 번들이 1명인 경우만 추가
        if (
          result.members.length + bundle.length <= INITIAL_MAX_GROUP_SIZE ||
          bundle.length === 1
        ) {
          if (
            canJoinByTime(result.members as any, {
              start: bundle[0].start,
              end: bundle[0].end,
            })
          ) {
            for (const p of bundle) {
              (result.members as any[]).push({
                userId: p.user,
                start: p.start,
                end: p.end,
                isBeforeResult: p.isBeforeResult,
              });
              clusteredParticipantIds.add(p.userId);
            }
          }
        }
      }
    }

    // ---------- 2) 확장 패스: eps × 1.5 ----------
    // (A) 기존 그룹에 합류 시도
    const attachWithExpandedEps = () => {
      // 결정성: userId 오름차순
      const remaining = coords
        .filter((p) => !clusteredParticipantIds.has(p.userId))
        .sort((a, b) => a.userId.localeCompare(b.userId));

      // placeId → 해당 place의 voteResults 인덱스들(생성 순서 오름차순)
      const groupsByPlace = new Map<string, number[]>();
      voteResults.forEach((gr, idx) => {
        const arr = groupsByPlace.get(gr.placeId as string) || [];
        arr.push(idx);
        groupsByPlace.set(gr.placeId as string, arr);
      });

      for (const p of remaining) {
        const expanded = p.eps * 1.5;

        // 이 참여자 기준으로 "가까운 장소" 탐색(결정성: 거리↑ → placeId↑)
        const placeRank = places
          .map((pl) => ({
            placeId: pl._id.toString(),
            isMain: (pl as any).status === 'main' ? 1 : 0,
            dist: distToPlace(p, pl.location.latitude, pl.location.longitude),
            lat: pl.location.latitude,
            lon: pl.location.longitude,
          }))
          .filter((x) => x.dist <= expanded)
          .sort(
            (a, b) =>
              b.isMain - a.isMain || // status = 'main' 우선
              a.dist - b.dist ||
              a.placeId.localeCompare(b.placeId),
          );

        let attached = false;
        for (const pr of placeRank) {
          const idxList = groupsByPlace.get(pr.placeId);
          if (!idxList || idxList.length === 0) continue;

          // 동일 place의 그룹들을 "생성된 순서"대로 시도
          for (const gi of idxList) {
            const g = voteResults[gi];
            // 시간 겹침 검사를 통과해야 합류
            // ✅ 이미 이 그룹이 가득 찼으면 패스
            if (g.members.length >= FINAL_MAX_GROUP_SIZE) continue;
            if (
              canJoinByTime(g.members as any, { start: p.start, end: p.end })
            ) {
              g.members.push({
                userId: p.user as IUser,
                start: p.start,
                end: p.end,
                // isBeforeResult: p.isBeforeResult, // (일관성) 누락 없이 포함
              });
              clusteredParticipantIds.add(p.userId);
              attached = true;
              break;
            }
          }
          if (attached) break;
        }
      }
    };

    // (B) eps×1.5로 "새로운 3인 이상" 그룹 형성 (장소별로 다시 수행)
    const formNewGroupsWithExpandedEpsAtPlace = (place: any) => {
      const placeId = place._id.toString();
      if (usedPlaceIds.has(placeId)) return;
      // 후보 만들기(확장 eps 적용)
      const expCandidates = [] as Array<{
        user: IUser;
        userId: string;
        dist: number;
        start: string;
        end: string;
        isBeforeResult: boolean;
        lat: number;
        lon: number;
      }>;
      for (const p of coords) {
        if (clusteredParticipantIds.has(p.userId)) continue;
        const d = distToPlace(
          p,
          place.location.latitude,
          place.location.longitude,
        );
        if (d <= p.eps * 1.5) {
          expCandidates.push({
            user: p.user as IUser,
            userId: p.userId,
            dist: d,
            start: p.start,
            end: p.end,
            isBeforeResult: p.isBeforeResult,
            lat: p.lat,
            lon: p.lon,
          });
        }
      }
      expCandidates.sort(
        (a, b) => a.dist - b.dist || a.userId.localeCompare(b.userId),
      );

      // 4 → 3(최소) 규칙을 재사용 + 3인 이상 확장 허용(MAX_GROUP_SIZE)
      const make = (targetMinSize: number) => {
        let pool = expCandidates.filter(
          (c) => !clusteredParticipantIds.has(c.userId),
        );
        if (pool.length >= targetMinSize) {
          const group: typeof pool = [];
          const first = pool[0];
          group.push(first);
          // 4인 우선 채우기
          for (
            let i = 1;
            i < pool.length && group.length < targetMinSize;
            i++
          ) {
            const cand = pool[i];
            if (canJoinByTime(group, cand)) group.push(cand);
          }
          if (group.length < targetMinSize) return;

          // 3인 이상 확장 허용 (권장 최대 6명)
          for (
            let i = 1;
            i < pool.length && group.length < INITIAL_MAX_GROUP_SIZE;
            i++
          ) {
            const cand = pool[i];
            if (group.find((m) => m.userId === cand.userId)) continue;
            if (clusteredParticipantIds.has(cand.userId)) continue;
            if (canJoinByTime(group, cand)) group.push(cand);
          }

          voteResults.push({
            placeId: place._id.toString(),
            members: group.map((g) => ({
              userId: g.user,
              start: g.start,
              end: g.end,
              isBeforeResult: g.isBeforeResult,
            })) as any,
            center: {
              lat: place.location.latitude,
              lon: place.location.longitude,
            },
          });
          usedPlaceIds.add(placeId);
          group.forEach((g) => clusteredParticipantIds.add(g.userId));
          const set = new Set(group.map((g) => g.userId));
          pool = pool.filter((x) => !set.has(x.userId));
        }
      };

      make(standardCnt);
      if (reducedCnt < standardCnt && !usedPlaceIds.has(placeId))
        make(reducedCnt);
    };

    // 확장 패스 실행(1) 기존 그룹 합류
    attachWithExpandedEps();

    // 확장 패스 실행(2) 남은 인원으로 새 그룹 형성 (status = 'main' 우선)
    for (const place of sortedPlaces) {
      formNewGroupsWithExpandedEpsAtPlace(place);
    }

    // ---------- 3) 최종 결과 정리/반환 ----------
    const successParticipations = voteResults.flatMap((result) =>
      result.members.map((member) => (member.userId as IUser)._id.toString()),
    );

    const failedParticipations = participations.filter(
      (p) =>
        !clusteredParticipantIds.has(
          (p.userId as unknown as IUser)._id.toString(),
        ),
    );

    return { voteResults, successParticipations, failedParticipations };
  }

  async setComment(date: string, comment: string) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date);
    vote.setComment(token.id, comment);

    await this.Vote2Repository.save(vote);
  }

  async alertStudyAbsence() {
    const today = DateUtils.getTodayYYYYMMDD();
    const vote = await this.Vote2Repository.findByDate(today, false);
    const realtimeData = await this.RealtimeService.getTodayDataWithPlace(
      today,
      false,
    );
    if (!vote) return;

    // member.start의 날짜는 신청 시점 날짜일 수 있어 그대로 비교하면 안 된다.
    // (그래서 예전에는 20시 스터디인 사람에게도 16시에 알림이 갔다.)
    const userIds = vote.getUnarrivedUserIdsAfterStart();

    const realTimeResult = realtimeData.userList.filter(
      (who) => who.status !== 'solo',
    );

    for (const who of realTimeResult) {
      if (who.arrived || who.absence) continue;

      // time.start의 날짜도 개설한 날짜일 수 있어 그대로 비교하면 안 된다(vote2와 동일).
      const startTime = realtimeData.getScheduledAt(who.time.start);
      if (startTime && startTime < new Date()) {
        // 예전에는 항목 객체를 그대로 넣어 "[object Object]"가 들어갔고,
        // 그 결과 realtime 참여자에게는 알림이 한 번도 가지 않았다.
        userIds.push(toId(who.user));
      }
    }

    if (userIds.length === 0) return;

    await this.fcmServiceInstance.sendNotificationUserIds(
      userIds,
      '스터디 출석 알림',
      '오늘 스터디, 출석 깜빡한 거 아니죠? 😶 설정한 스터디 시작 시간이 지났어요. 도착하셨다면 출석체크를 진행해 주세요!',
      `/studyPage?date=${today}`,
    );
  }

  async processAbsenceFee() {
    const yesterday = DateUtils.getYesterdayYYYYMMDD();
    const vote = await this.Vote2Repository.findByDate(yesterday, false);
    if (!vote) return;

    for (const result of vote.results) {
      const members = result.members;
      // 불참 신고자도 arrived에 신고 시각이 들어가므로 absence를 함께 봐야 한다.
      // 이게 빠지면 성실히 신고한 사람이 많을수록 "합의 취소" 면제가 깨져,
      // 남은 무단 불참자에게 벌금이 부과된다.
      const arrivedCount = members.filter(
        (m) => m.arrived && !m.absence,
      ).length;

      // 절반 미만 참석 = 합의 취소, 벌금 없음
      if (arrivedCount * 2 < members.length) continue;

      for (const member of members) {
        if (!member.arrived && !member.absence) {
          await this.userServiceInstance.updatePointById(
            CONST.POINT.ABSENCE_FEE,
            '스터디 무단 불참 벌금',
            '',
            member.userId.toString(),
          );
        }
      }
    }
  }

  async setResult(date: string) {
    try {
      const today = DateUtils.getTodayYYYYMMDD();
      const targetDate = date || today;
      // 결과 알림은 "오늘"만 대상으로 한다.
      // 과거 날짜를 다시 계산할 때 엉뚱한 알림을 쏘면 안 된다.
      const isToday = targetDate === today;

      const vote2 = await this.Vote2Repository.findByDate(targetDate);

      //투표 결과 계산 시작
      const participations: IParticipation[] = vote2.participations;
      const { voteResults, successParticipations, failedParticipations } =
        await this.doAlgorithm(participations);

      const successUserIds = successParticipations.map((userId) => userId);

      const failedUserIds = failedParticipations.map((par) => {
        if (typeof par.userId === 'string') {
          return par.userId;
        }
        return (par.userId as unknown as IUser)._id.toString();
      });

      const resultInstances = voteResults.map((r) => new Result(r as any));
      vote2.setResult(resultInstances);

      await this.Vote2Repository.save(vote2);

      // for (let participation of participations) {
      //   await this.userServiceInstance.updatePointById(
      //     CONST.POINT.STUDY_ALL_RESULT,
      //     `스터디 매칭 신청 리워드`,
      //     'study',
      //     (participation.userId as unknown as IUser)._id?.toString(),
      //   );
      // }
      // 과거 날짜를 다시 계산하는 경우에는 알림을 보내지 않는다.
      if (isToday) {
        await this.fcmServiceInstance.sendNotificationUserIds(
          successUserIds,
          WEBPUSH_MSG.VOTE.SUCCESS_TITLE,
          WEBPUSH_MSG.VOTE.SUCCESS_DESC,
          `/studyPage?date=${targetDate}`,
        );

        await this.fcmServiceInstance.sendNotificationUserIds(
          failedUserIds,
          WEBPUSH_MSG.VOTE.FAILURE_TITLE,
          WEBPUSH_MSG.VOTE.FAILURE_DESC,
          `/studyPage?date=${targetDate}`,
        );
      }
    } catch (err) {
      console.log(err);
      throw new AppError(err?.message ?? 'Failed to set result', 500);
    }
  }

  async updateParticipation(date: string, start: string, end: string) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date, false);

    vote.updateParticipation(token.id, start, end);
    await this.Vote2Repository.save(vote);
  }

  async updateResult(date: string, start: string, end: string) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date);

    vote.updateResult(token.id, start, end);
    await this.Vote2Repository.save(vote);
  }

  async getFilteredVoteOne(date: string) {
    const voteData = await this.Vote2Repository.findByDate(date);
    return voteData.results.map((result) => {
      return {
        place: result.placeId,
        absences: result.members.filter((member) => member.absence),
        // absence를 빼지 않으면 불참 신고자가 absences와 members 양쪽에 중복으로 들어간다.
        members: result.members.filter(
          (member) => member.arrived && !member.absence,
        ),
      };
    });
  }

  async setArrive(date: string, memo: string, end: string, buffer: Buffer) {
    let imageUrl = '';
    if (buffer) {
      imageUrl = await this.imageServiceInstance.uploadSingleImage(
        'gather',
        buffer,
      );
    }

    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date);
    const arriveResult = vote.setArrive(token.id, memo, end, imageUrl);

    // 확정된 스터디에 속해 있지 않거나 이미 출석 처리된 경우에는 점수·포인트를 주지 않는다.
    // (예전에는 결과와 무관하게 지급돼 중복 호출 시 중복 지급됐다.)
    if (arriveResult === 'not-member') {
      throw new AppError('확정된 스터디가 없어 출석 처리할 수 없습니다.', 400);
    }
    if (arriveResult === 'already-arrived') {
      throw new AppError('이미 출석 처리된 스터디입니다.', 400);
    }

    await this.Vote2Repository.save(vote);


    const isArriveBefore = vote.isVoteBefore(token.id);
    const isLate = vote.isLate(token.id);
    let point = 0;

    await this.userServiceInstance.updateScore(
      CONST.SCORE.ATTEND_STUDY,
      '스터디 출석',
    );
    await this.userServiceInstance.updateStudyRecord(
      'study',
      getStudyMinutesUntil(end),
    );

    if (isArriveBefore) {
      point = isLate
        ? CONST.POINT.STUDY_ATTEND_BEFORE() + CONST.POINT.LATE
        : CONST.POINT.STUDY_ATTEND_BEFORE();
      await this.userServiceInstance.updatePoint(
        point,
        `스터디 출석 ${isLate ? '(지각)' : ''}`,
        'study',
      );

      return {
        point,
        message: `스터디 출석 ${isLate ? '(지각)' : ''}`,
      };
    } else {
      // 미리 신청하지 않고 당일 합류한 경우. 신청자보다 적게 받는다.
      point = CONST.POINT.STUDY_ATTEND_AFTER();
      const message = '스터디 당일 참여';
      await this.userServiceInstance.updatePoint(point, message, 'study');

      return { point, message };
    }
  }

  patchArrive(date: string) {
    throw new Error('Method not implemented.');
  }

  async setParticipate(date: string, createParticipate: CreateParticipateDTO) {
    const token = RequestContext.getDecodedToken();
    const { placeId, start, end, eps } = createParticipate;

    const vote = await this.Vote2Repository.findByDate(date);

    vote.setParticipate(placeId, {
      start,
      end,
      eps,
      userId: token.id,
    });

    await this.Vote2Repository.save(vote);
  }
  async changeStudyPlace(date: string, placeId: string, beforeId: string) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date, false);

    const result = vote?.findStudyPlace(beforeId);
    if (!result) {
      throw new AppError('변경할 스터디를 찾을 수 없습니다.', 400);
    }

    const memberIds = result.members.map((member) => toId(member.userId));

    // 같은 조 멤버만 바꿀 수 있다. 예전에는 검증이 전혀 없어서 date와 placeId만 알면
    // 아무나 남의 조 장소를 옮기고 그 조 전원에게 푸시를 보낼 수 있었다.
    if (!memberIds.includes(toId(token.id))) {
      throw new AppError('이 스터디의 멤버만 장소를 변경할 수 있습니다.', 403);
    }

    // 같은 장소를 다시 고른 경우. 저장도 푸시도 필요 없다(반복 호출로 푸시가 쌓이는 것도 막는다).
    if (toId(result.placeId) === toId(placeId)) {
      return;
    }

    // 존재하지 않는 placeId로 바꾸면 그 조 전원의 상세 페이지가 깨지고 되돌릴 UI도 없다.
    // 같은 쿼리로 푸시에 쓸 카페 이름도 가져온다.
    const places = await this.PlaceRepository.findByIds([beforeId, placeId]);
    const nextPlace = places.find((place) => toId(place._id) === toId(placeId));

    if (!nextPlace) {
      throw new AppError('변경할 장소를 찾을 수 없습니다.', 400);
    }

    const beforePlace = places.find(
      (place) => toId(place._id) === toId(beforeId),
    );

    result.placeId = placeId;
    await this.Vote2Repository.save(vote);

    // 저장이 실패했는데 푸시만 나가지 않도록 save 뒤에 보낸다.
    // 본인은 자기가 바꾼 것이므로 대상에서 뺀다.
    const targetIds = memberIds.filter((id) => id && id !== toId(token.id));

    if (targetIds.length > 0) {
      // 어디로 옮겼는지까지 알려준다. 예전에는 "변경했어요"만 와서 앱을 열어야 알 수 있었다.
      const body = beforePlace
        ? `${token.name}님이 오늘 스터디 장소를 ${beforePlace.name} → ${nextPlace.name}으로 변경했어요.`
        : `${token.name}님이 오늘 스터디 장소를 ${nextPlace.name}으로 변경했어요.`;

      await this.fcmServiceInstance.sendNotificationUserIds(
        targetIds,
        '스터디 장소 변경 안내',
        body,
        `/study/${placeId}/${date}?type=results`,
      );
    }
  }

  /**
   * 기간 내 날짜별 출석 기록. 공부 기록 캘린더가 쓴다.
   *
   * 예전에는 프론트가 `GET /vote/arrived`를 호출했는데 백엔드에 `vote` 컨트롤러가 없어
   * 항상 실패했다(캘린더가 비어 보였다). 같은 응답 형태를 vote2 데이터로 다시 만든다.
   */
  async getAttendRecord(startDay: string, endDay: string) {
    const votes = await this.Vote2Repository.getVoteByPeriod(startDay, endDay);

    return votes
      .map((vote) => ({
        date: vote.date,
        arrivedInfoList: vote.results
          .map((result) => ({
            placeId: toId(result.placeId),
            // 불참 신고자도 arrived에 신고 시각이 들어가므로 absence를 함께 본다.
            arrivedInfo: result.members
              .filter((member) => member.arrived && !member.absence)
              .map((member) => {
                const user = member.userId as unknown as IUser;
                return { uid: user?.uid, name: user?.name };
              })
              .filter((info) => info.uid),
          }))
          .filter((entry) => entry.arrivedInfo.length > 0),
      }))
      .filter((entry) => entry.arrivedInfoList.length > 0);
  }

  async getAbsence(date: string) {
    const voteData = await this.Vote2Repository.findByDate(date);

    const resultArr = [];
    voteData.results.forEach((result) => {
      resultArr.push(
        // absence로 걸러야 한다. memo는 불참 사유와 출석 메모("2층 창가, 체크 셔츠")를
        // 같은 필드에 담으므로, 필터가 없으면 출석자의 인상착의가 불참 사유 목록으로 새어 나간다.
        ...result.members
          .filter((member) => member.absence)
          .map((member) => {
            return {
              userId: member.userId,
              message: member.memo,
            };
          }),
      );
    });

    return resultArr;
  }

  async setAbsence(date: string, message: string, fee?: number) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date);

    const absenceResult = vote.setAbsence(token.id, message);

    // 확정된 스터디가 없거나 이미 불참 처리된 경우에는 저장도 차감도 하지 않는다.
    // (예전에는 결과와 무관하게 차감이 나가 중복 신고 시 중복 차감됐다.)
    if (absenceResult === 'not-member') {
      throw new AppError('확정된 스터디가 없어 불참 처리할 수 없습니다.', 400);
    }
    if (absenceResult === 'already-absent') {
      throw new AppError('이미 불참 처리된 스터디입니다.', 400);
    }

    await this.Vote2Repository.save(vote);

    const point = Vote2Service.getStudyAbsencePoint();

    await this.userServiceInstance.updatePoint(point, '스터디 당일 불참');

    return {
      point,
      message: '스터디 당일 불참',
    };
  }

  async updateMemo(date: string, memo: string) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date);
    vote.updateMemo(token.id, memo);
    await this.Vote2Repository.save(vote);

    return {
      message: '메모 업데이트 성공',
    };
  }

  async updateArriveMemo(date: string, memo: string) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date);

    vote.updateArriveMemo(token.id, memo);
    await this.Vote2Repository.save(vote);

    return {
      message: '메모 업데이트 성공',
    };
  }

  /**
   * "내일 스터디 매칭이 예정되어 있어요" 알림(21:10).
   *
   * 예전에는 **오늘** 문서의 `results`를 대상으로 보냈다. 오늘 결과에 들어간 사람은
   * 이미 오늘 스터디를 다녀온 사람이라, 내일 신청해 둔 사람에게는 알림이 가지 않고
   * 엉뚱한 사람에게 "내일 예정"이라고 알리고 있었다. 링크의 date도 오늘이었다.
   *
   * 매칭은 당일 09:00에 돌기 때문에 내일의 `results`는 아직 없다. 따라서 대상은
   * 내일 날짜에 신청해 둔 사람(`participations`)이다.
   */
  async alertMatching() {
    const tomorrow = DateUtils.getTomorrowYYYYMMDD();
    const vote = await this.Vote2Repository.findByDate(tomorrow, false);
    if (!vote) return;

    // toId로 모아야 중복이 걸러진다. 예전에는 ObjectId 객체를 includes로 비교해
    // 참조가 다르면 같은 사람도 중복으로 들어갔다.
    const userIds = [
      ...new Set(
        (vote.participations ?? []).map((participation) =>
          toId(participation.userId),
        ),
      ),
    ].filter(Boolean);

    if (!userIds.length) return;

    await this.fcmServiceInstance.sendNotificationUserIds(
      userIds,
      '스터디 예정 알림',
      '내일 스터디 매칭이 예정되어 있어요!',
      `/studyPage?date=${tomorrow}`,
    );
  }
}
