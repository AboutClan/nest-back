import { Inject } from '@nestjs/common';
import dayjs from 'dayjs';
import { CONST } from 'src/Constants/CONSTANTS';
import { Realtime } from 'src/domain/entities/Realtime/Realtime';
import { Result } from 'src/domain/entities/Vote2/Vote2Result';
import { RequestContext } from 'src/request-context';
import { PlaceRepository } from 'src/routes/place/place.repository.interface';
import RealtimeService from 'src/routes/realtime/realtime.service';
import { IUser } from 'src/routes/user/user.entity';
import { UserService } from 'src/routes/user/user.service';
import { WebPushService } from 'src/routes/webpush/webpush.service';
import { ClusterUtils, coordType } from 'src/utils/ClusterUtils';
import { DateUtils } from 'src/utils/Date';
import { IPLACE_REPOSITORY, IVOTE2_REPOSITORY } from 'src/utils/di.tokens';
import { FcmService } from '../fcm/fcm.service';
import { CreateNewVoteDTO, CreateParticipateDTO } from './vote2.dto';
import { IMember, IParticipation, IResult } from './vote2.entity';
import { IVote2Repository } from './Vote2Repository.interface';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
export class Vote2Service {
  constructor(
    @Inject(IVOTE2_REPOSITORY)
    private readonly Vote2Repository: IVote2Repository,
    @Inject(IPLACE_REPOSITORY)
    private readonly PlaceRepository: PlaceRepository,
    private readonly RealtimeService: RealtimeService,
    private readonly userServiceInstance: UserService,
    private readonly webPushServiceInstance: WebPushService,
    private readonly fcmServiceInstance: FcmService,
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
        attendanceImage: member?.img,
        type: member.arrived ? 'arrived' : member?.absence ? 'absenced' : null,
      },
      comment: member.comment,
    };

    return form;
  }

  async getWeekData() {
    const dates = DateUtils.getWeekDate();

    const rawData = await Promise.all(
      dates.map(async (date, idx) => {
        if (idx === 0) {
          return await this.getAfterVoteInfo(date);
        } else {
          const before = await this.getBeforeVoteInfo(date);
          // const realtime = await this.RealtimeService.getTodayData(date);
          return { ...before };
        }
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

  async getVoteInfo(date: string) {
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

    return this.getBeforeVoteInfo(date);
  }

  private async getBeforeVoteInfo(date: string) {
    const participations: IParticipation[] =
      await this.Vote2Repository.findParticipationsByDate(date);

    const { voteResults } = await this.doAlgorithm(participations);
   
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

    const participations = voteData?.participations;

    const unmatchedUsers = [];

    const resultMembers = voteData.results.flatMap((result) =>
      result.members.map((member) => member.userId.toString()),
    );

    participations?.forEach((par) => {
      if (!resultMembers.includes(par.userId.toString())) {
        unmatchedUsers.push(par.userId);
      }
    });

    return {
      results: voteData.results.map((result) => ({
        place: result.placeId,
        members: result.members.map((member: any) =>
          this.formatResultMember(member),
        ),
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

  async getArrivedPeriod(startDay: string, endDay: string) {
    const votes = await this.Vote2Repository.getVoteByPeriod(startDay, endDay);

    const result = [];
    votes.forEach((vote) => {
      const a = {
        date: vote.date,
        arrivedInfoList: vote.results.map((result) => {
          const arrivedMembers = result.members.filter(
            (member) => member.arrived,
          );

          return {
            placeId: result.placeId,
            arrivedInfo: arrivedMembers.map((member) => {
              return {
                uid: member.userId.uid,
                name: member.userId.name,
              };
            }),
          };
        }),
      };
      result.push(a);
    });

    return result;
  }

  async setVote(date: string, createVote: CreateNewVoteDTO) {
    const token = RequestContext.getDecodedToken();

    const vote2 = await this.Vote2Repository.findByDate(date);

    const { latitude, longitude, start, end, locationDetail, userId, eps } =
      createVote;

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

    vote2.setOrUpdateParticipation(voteData);

    await this.Vote2Repository.save(vote2);

    return;
  }

  async setVoteWithArr(dates: string[], createVote: CreateNewVoteDTO) {
    const thisWeek = DateUtils.getWeekDate();

    for (const date of thisWeek) {
      if (dates.includes(date)) {
        await this.setVote(date, createVote);
      } else {
        await this.deleteVote(date);
      }
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

  private refineClusters(
    coords: coordType[],
    clusters: number[][],
    maxMember: number,
    eps: number,
  ): number[][] {
    // 더 이상 분해가 필요 없으면 그대로 반환
    if (ClusterUtils.findLongestArrayLength(clusters) <= maxMember) {
      return clusters;
    }

    // 각 클러스터를 순회하면서, 너무 크면 반으로 재클러스터링
    return clusters.flatMap((cluster) => {
      if (cluster.length <= maxMember) {
        return [cluster];
      }
      // cluster에 속한 좌표만 뽑아서 DBSCAN
      const subCoords = cluster.map((i) => coords[i]);
      const { clusters: subClusters } = ClusterUtils.DBSCANClustering(
        subCoords,
        eps / 2,
      );

      // subClusters는 subCoords 기준 인덱스이므로 원본 인덱스로 매핑
      const remapped = subClusters.map((sub) =>
        sub.map((localIdx) => cluster[localIdx]),
      );

      // 재귀 호출로 깊이가 남아있다면 계속 분해
      return this.refineClusters(coords, remapped, maxMember, eps / 2);
    });
  }

  private async doAlgorithm(participations: IParticipation[]) {
    const MIN_OVERLAP_MINUTES = 60;
    const MAX_GROUP_SIZE = 8; //

    // 겹치는 시간 확인
    function overlapMinutes(
      a: { start: string; end: string },
      b: { start: string; end: string },
    ) {
      const as = Date.parse(a.start);
      const ae = Date.parse(a.end);
      const bs = Date.parse(b.start);
      const be = Date.parse(b.end);
      const overlapMs = Math.min(ae, be) - Math.max(as, bs);
      return Math.max(0, Math.floor(overlapMs / 60000)); // 분 단위 환산
    }
    // 참여 시간 2시간 이상 겹치는지도 고려
    function canJoinByTime(
      group: Array<{ start: string; end: string }>,
      c: { start: string; end: string },
    ) {
      return group.some((m) => overlapMinutes(m, c) >= MIN_OVERLAP_MINUTES);
    }

    const coords = participations.map((par) => ({
      user: par.userId,
      userId: (par.userId as unknown as IUser)._id.toString(),
      lat: parseFloat(par.latitude),
      lon: parseFloat(par.longitude),
      eps: par?.eps || 3,
      start: par.start,
      end: par.end,
      isBeforeResult: par.isBeforeResult,
    }));

    const places = await this.PlaceRepository.findByStatus('main');

    const voteResults: IResult[] = [];
    const clusteredParticipantIds = new Set<string>(); // 이미 클러스터에 속한 참여자 ID 관리

    // ---------- 1) 기본 패스: 4인 우선 → 3인 이상 ----------
    for (const place of places) {
      const candidates = [] as Array<{
        user: IUser;
        userId: string;
        dist: number;
        start: string;
        end: string;
        isBeforeResult: boolean;
        lat: number;
        lon: number;
      }>;

      for (const participant of coords) {
        if (clusteredParticipantIds.has(participant.userId)) continue;

        const distance = ClusterUtils.haversineDistance(
          place.location.latitude,
          place.location.longitude,
          participant.lat,
          participant.lon,
        );

        if (distance <= participant.eps) {
          candidates.push({
            user: participant.user as IUser,
            userId: participant.userId,
            dist: distance,
            start: participant.start,
            end: participant.end,
            isBeforeResult: participant.isBeforeResult,
            lat: participant.lat,
            lon: participant.lon,
          });
        }
      }

      // 결정성 보장: 거리↑ → userId↑
      candidates.sort(
        (a, b) => a.dist - b.dist || a.userId.localeCompare(b.userId),
      );

      const makeGroupsAtPlace = (targetMinSize: number) => {
        // 남아있는 후보(배정 안 된 사람)만
        let pool = candidates.filter(
          (c) => !clusteredParticipantIds.has(c.userId),
        );

        // while: 이 장소에서 targetMinSize 이상 뽑을 수 있을 때 계속 만든다
        while (pool.length >= targetMinSize) {
          const groupMembers: typeof pool = [];

          // 1) 첫 멤버는 제약 없이 추가
          const first = pool[0];
          groupMembers.push(first);

          // 2) 이후 멤버는 "그룹 내 누군가와 120분 이상 겹침"을 만족해야 추가
          for (let i = 1; i < pool.length && groupMembers.length < 4; i++) {
            const cand = pool[i];
            // 4인 우선 채우기
            groupMembers.push(cand);
            // if (canJoinByTime(groupMembers, cand)) {
            //   groupMembers.push(cand);
            // }
          }

         
          // targetMinSize(4 또는 3)를 못 채웠다면 종료
          if (groupMembers.length < targetMinSize) break;

          // 3) "3인 이상" 규칙: 4명이 채워졌다면(또는 3명이 채워졌다면),
          //    남은 pool에서 시간 겹침을 만족하는 멤버를 MAX_GROUP_SIZE까지 추가 허용
          for (
            let i = 1;
            i < pool.length && groupMembers.length < MAX_GROUP_SIZE;
            i++
          ) {
            const cand = pool[i];
            if (groupMembers.find((m) => m.userId === cand.userId)) continue;
            if (clusteredParticipantIds.has(cand.userId)) continue;
            if (canJoinByTime(groupMembers, cand)) {
              groupMembers.push(cand);
            }
          }

          // 그룹 확정
          voteResults.push({
            placeId: place._id.toString(),
            members: groupMembers.map((g) => ({
              userId: g.user,
              start: g.start,
              end: g.end,
              isBeforeResult: g.isBeforeResult,
            })),
            // 장소 기반 center로 고정(결정성/안전)
            center: {
              lat: place.location.latitude,
              lon: place.location.longitude,
            },
          });

          // 배정 처리
          groupMembers.forEach((g) => clusteredParticipantIds.add(g.userId));
          // 풀에서 제거
          const assignedSet = new Set(groupMembers.map((g) => g.userId));
          pool = pool.filter((x) => !assignedSet.has(x.userId));
        }
      };

      // 4인 우선
      makeGroupsAtPlace(4);
      // 4인으로 못 채운 게 남아있으면 3인 이상(최소 3)으로 보조
      makeGroupsAtPlace(3);
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
            dist: ClusterUtils.haversineDistance(
              pl.location.latitude,
              pl.location.longitude,
              p.lat,
              p.lon,
            ),
            lat: pl.location.latitude,
            lon: pl.location.longitude,
          }))
          .filter((x) => x.dist <= expanded)
          .sort(
            (a, b) => a.dist - b.dist || a.placeId.localeCompare(b.placeId),
          );

        let attached = false;
        for (const pr of placeRank) {
          const idxList = groupsByPlace.get(pr.placeId);
          if (!idxList || idxList.length === 0) continue;

          // 동일 place의 그룹들을 "생성된 순서"대로 시도
          for (const gi of idxList) {
            const g = voteResults[gi];
            // 시간 겹침 검사를 통과해야 합류
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
        const d = ClusterUtils.haversineDistance(
          place.location.latitude,
          place.location.longitude,
          p.lat,
          p.lon,
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
        while (pool.length >= targetMinSize) {
          const group: typeof pool = [];
          const first = pool[0];
          group.push(first);
          // 4인 우선 채우기
          for (let i = 1; i < pool.length && group.length < 4; i++) {
            const cand = pool[i];
            if (canJoinByTime(group, cand)) group.push(cand);
          }
          if (group.length < targetMinSize) break;

          // 3인 이상 확장 허용
          for (
            let i = 1;
            i < pool.length && group.length < MAX_GROUP_SIZE;
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
            })),
            center: {
              lat: place.location.latitude,
              lon: place.location.longitude,
            },
          });

          group.forEach((g) => clusteredParticipantIds.add(g.userId));
          const set = new Set(group.map((g) => g.userId));
          pool = pool.filter((x) => !set.has(x.userId));
        }
      };

      make(4);
      make(3);
    };

    // 확장 패스 실행(1) 기존 그룹 합류
    attachWithExpandedEps();

    // 확장 패스 실행(2) 남은 인원으로 새 그룹 형성
    for (const place of places) {
      formNewGroupsWithExpandedEpsAtPlace(place);
    }

    // ---------- 3) 최종 결과 정리/반환 ----------
    const successParticipations = voteResults.flatMap((result) =>
      result.members.map((member) => member.userId.toString()),
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

  async setResult(date: string) {
    const today = DateUtils.getTodayYYYYMMDD();

    //vote2에서 realtime 성공한 유저 삭제
    const realtimeSuccessUsers = await this.RealtimeService.setResult();
    const vote2 = await this.Vote2Repository.findByDate(today);

    for (const user of realtimeSuccessUsers) {
      vote2.removeParticipationByUserId(user);
    }

    //투표 결과 계산 시작
    const participations: IParticipation[] = vote2.participations;
    const { voteResults, successParticipations, failedParticipations } =
      await this.doAlgorithm(participations);

    const successUserIds = successParticipations.map((userId) => userId);

    const failedUserIds = failedParticipations.map(
      (par) => (par.userId as unknown as IUser)._id,
    );

    const resultInstances = voteResults.map((r) => new Result(r as any));
    vote2.setResult(resultInstances);

    await this.Vote2Repository.save(vote2);

    for (let participation of participations) {
      await this.userServiceInstance.updatePointById(
        CONST.POINT.STUDY_ALL_RESULT,
        `스터디 매칭 신청 리워드`,
        'study',
        participation.userId.toString(),
      );
    }

    this.webPushServiceInstance.sendNotificationUserIds(
      successUserIds,
      WEBPUSH_MSG.VOTE.SUCCESS_TITLE,
      WEBPUSH_MSG.VOTE.SUCCESS_DESC,
    );

    this.webPushServiceInstance.sendNotificationUserIds(
      failedUserIds,
      WEBPUSH_MSG.VOTE.FAILURE_TITLE,
      WEBPUSH_MSG.VOTE.FAILURE_DESC,
    );
    await this.fcmServiceInstance.sendNotificationUserIds(
      successUserIds,
      WEBPUSH_MSG.VOTE.SUCCESS_TITLE,
      WEBPUSH_MSG.VOTE.SUCCESS_DESC,
    );

    await this.fcmServiceInstance.sendNotificationUserIds(
      failedUserIds,
      WEBPUSH_MSG.VOTE.FAILURE_TITLE,
      WEBPUSH_MSG.VOTE.FAILURE_DESC,
    );
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
        members: result.members.filter((member) => member.arrived),
      };
    });
  }

  async setArrive(date: string, memo: string, end: string) {
    const token = RequestContext.getDecodedToken();

    const arriveData = {
      memo,
      arrived: new Date(),
      end,
    };

    const vote = await this.Vote2Repository.findByDate(date);
    vote.setArrive(token.id, memo, end);
    //todo: score, point 추가
    await this.Vote2Repository.save(vote);

    // await this.userServiceInstance.setVoteArriveInfo(token.id, arriveData.end);

    const isArriveBefore = vote.isVoteBefore(token.id);
    const isLate = vote.isLate(token.id);
    let point = 0;

    await this.userServiceInstance.updateScore(
      CONST.SCORE.ATTEND_STUDY,
      '스터디 출석',
    );
    await this.userServiceInstance.updateStudyRecord('study');

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
      point = CONST.POINT.STUDY_ATTEND_AFTER();
      const message = `스터디 당일 참여`;
      await this.userServiceInstance.updatePoint(point, message, 'study');

      return {
        point,
        message: `스터디 당일 참여 `,
      };
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

  async getAbsence(date: string) {
    const voteData = await this.Vote2Repository.findByDate(date);

    const resultArr = [];
    voteData.results.forEach((result) => {
      resultArr.push(
        ...result.members.map((member) => {
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

    vote.setAbsence(token.id, message);

    await this.Vote2Repository.save(vote);

    const isLate = dayjs().tz('Asia/Seoul').hour() > 13;

    await this.userServiceInstance.updatePoint(
      isLate ? CONST.POINT.NO_SHOW : CONST.POINT.ABSENCE,
      `스터디 당일 ${isLate ? '노쇼' : '불참'}`,
    );

    return {
      point: isLate ? CONST.POINT.NO_SHOW : CONST.POINT.ABSENCE,
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
}
