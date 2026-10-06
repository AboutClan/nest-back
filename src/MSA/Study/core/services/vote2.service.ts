import { Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { Model } from 'mongoose';
import { CONST, getLatePenalty } from 'src/Constants/CONSTANTS';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { AppError } from 'src/errors/AppError';
import { PlaceRepository } from 'src/MSA/Place/core/interfaces/place.repository.interface';
import RealtimeService from 'src/MSA/Study/core/services/realtime.service';
import { UserService } from 'src/MSA/User/core/services/user.service';
import { IUser } from 'src/MSA/User/entity/user.entity';
import { RequestContext } from 'src/request-context';
import { ClusterUtils } from 'src/utils/ClusterUtils';
import {
  DateUtils,
  getScheduledAtOnDate,
  getStudyMinutesUntil,
} from 'src/utils/Date';
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
import { toId, Vote2 } from '../domain/Vote2/Vote2';
import { Result } from '../domain/Vote2/Vote2Result';
import { IVote2Repository } from '../interfaces/Vote2Repository.interface';
// 유저가 지정할 수 있는 매칭 기준점 최대 개수. 프론트 UI와 맞춰져 있다.
const MAX_ANCHORS = 2;

/**
 * 가짜 신청자(시딩).
 *
 * "어차피 안 열릴 것 같아서" 신청하지 않는 문제 때문에, 지역별 대표 장소에 가짜 신청자를
 * 미리 넣어 라운지 인원과 9시 전 미리보기("오픈 예정" 조)가 보이게 한다.
 *
 * - 실제 신청이 많은 상위 ACTIVE_REGION_COUNT개 지역에만 넣는다. 인기 1위 지역 PER_SPOT_MAX명,
 *   나머지는 비율대로(최소 1명). 그 밖의 지역은 0명.
 * - 지역마다 "단골" 가짜 REGULARS_PER_REGION명을 고정해 두고, 날짜마다 그중 일부를 돌아가며 쓴다.
 *   무작위로 뽑으면 일주일 동안 서로 다른 가짜가 쌓여 라운지 인원이 크게 부풀었다.
 *
 * - 실제 신청자만으로 확정 기준(5명, 미달 시 4명) 조가 만들어지면 그 조 근처 가짜는 빠진다.
 * - 09:00 매칭 직전에는 남은 가짜를 전부 지운다. 가짜가 실제 조에 배정되는 일은 없다.
 * - 가짜는 role 'dummy' User이고 uid 접두사로 다른 도메인의 dummy와 구분한다.
 */
const DUMMY_STUDY_UID_PREFIX = 'dummy_study_';
const DUMMY_SEED = {
  LOOKBACK_DAYS: 28, // 지역 인기를 잴 때 보는 기간
  POPULARITY_RADIUS_KM: 3, // 이 반경 안의 신청을 그 지역 신청으로 센다
  // 지역마다 이 간격의 날짜에만 넣는다(3이면 사흘에 한 번, 주 2~3일). 매일 스터디가 예정돼 보일 필요는 없고,
  // 지역마다 시작 날짜를 어긋나게 해 같은 날 여러 지역이 한꺼번에 차지 않게 한다.
  DAY_INTERVAL: 3,
  ACTIVE_REGION_COUNT: 3, // 가짜를 넣는 지역 수(실제 신청 많은 순). 라운지 가짜 인원 상한 = 이 값 × REGULARS_PER_REGION
  PER_SPOT_MIN: 1, // 가짜를 넣는 지역의 최소 인원
  PER_SPOT_MAX: 2, // 신청이 가장 많은 지역
  REGULARS_PER_REGION: 2, // 지역별 고정 가짜 수. 날짜마다 이 안에서 돌아가며 쓴다.
  POOL_SIZE: 30, // 재사용할 가짜 유저 수. 지역 수 × REGULARS_PER_REGION 이상이어야 한다.
  EPS: 2, // 가짜 신청자의 매칭 반경(km)
  START_HOURS: ['12:00', '13:00', '14:00'],
  END_HOURS: ['17:00', '18:00', '19:00'],
};
/**
 * 지역별 대표 장소. 프론트 STUDY_CREW_REGION_LOCATION_MAPPING
 * (about-web constants/service/study/place.ts)과 같은 값이다. 바꾸면 양쪽을 같이 고친다.
 * address는 프론트가 두 번째 토큰(구)을 지역 배지로 쓰므로 구까지 적는다.
 */
const DUMMY_SEED_REGIONS = [
  {
    name: '수원·용인',
    address: '경기도 수원시 팔달구 인계동',
    latitude: 37.26424,
    longitude: 127.030092,
  },
  {
    name: '강남·서초',
    address: '서울특별시 강남구',
    latitude: 37.496193,
    longitude: 127.030907,
  },
  {
    name: '건대·왕십리',
    address: '서울특별시 성동구',
    latitude: 37.54024,
    longitude: 127.070525,
  },
  {
    name: '마포·영등포',
    address: '서울특별시 마포구',
    latitude: 37.557795,
    longitude: 126.923103,
  },
  {
    name: '노원구',
    address: '서울특별시 노원구 상계동',
    latitude: 37.65399,
    longitude: 127.058,
  },
  {
    name: '성북구',
    address: '서울특별시 성북구',
    latitude: 37.590298,
    longitude: 127.018552,
  },
  {
    name: '인천',
    address: '인천광역시',
    latitude: 37.4563,
    longitude: 126.7052,
  },
  {
    name: '사당·관악구',
    address: '서울특별시 관악구',
    latitude: 37.478163,
    longitude: 126.959432,
  },
];
/**
 * 가짜 유저 프로필. 실제 회원은 한 줄 소개와 공부 스타일(과목·스타일·도구)을 갖고 있어서,
 * 비어 있으면 라운지 목록에서 "코멘트 없음"으로 티가 났다. 값 형식은 프론트 공부 스타일 설문
 * (about-web StudyIntroduceDrawer)이 저장하는 문자열과 같아야 태그가 제대로 그려진다.
 */
const DUMMY_COMMENTS = [
  '편하게 말 걸어주세요, 잘 부탁드려요!',
  '조용히 집중하는 편이에요',
  '같이 공부할 사람 환영해요',
  '이번 주 목표는 꼭 끝내기!',
  '카공 자주 다녀요 :)',
  '잘 부탁드립니다!',
  '쉬는 시간엔 수다도 좋아요',
  '꾸준히 나오려고 해요',
];
const DUMMY_SUBJECTS = [
  '코딩',
  '전공 공부',
  '취업 준비',
  '토익',
  '자격증',
  '독서',
  '개인 업무',
  '과제',
  '외국어 공부',
];
const DUMMY_STUDY_STYLES = [
  '[쉬엄쉬엄] 공부하다가 편하게 대화해도 좋아요!',
  '[밸런스] 공부할 땐 집중하고, 중간중간 쉬면서 대화하는 걸 좋아해요.',
  '[몰입형] 적당한 대화도 좋지만, 개인 작업에 더 집중하는 걸 선호해요.',
];
const DUMMY_STUDY_TOOLS = [
  '노트북 위주로 사용해요',
  '책, 필기도구 위주로 사용해요',
];
/**
 * 지역 멤버 탭의 묶음 단위. 구 단위로 나누면 1~2명짜리 구가 수십 개 생겨서, 서울은 생활권으로,
 * 서울 밖은 광역(경기 남부·북부, 인천)으로 묶는다. 순서는 의미 없다(인원 순으로 다시 정렬한다).
 */
const SEOUL_ZONES: Record<string, string[]> = {
  '강남·서초': ['강남구', '서초구'],
  '송파·강동': ['송파구', '강동구'],
  '관악·동작': ['관악구', '동작구'],
  '영등포·강서': ['영등포구', '구로구', '금천구', '양천구', '강서구'],
  '마포·서대문·은평': ['마포구', '서대문구', '은평구'],
  '종로·중구·용산': ['종로구', '중구', '용산구'],
  '성동·광진': ['성동구', '광진구'],
  '성북·동대문·중랑': ['성북구', '동대문구', '중랑구'],
  '노원·도봉·강북': ['노원구', '도봉구', '강북구'],
};
const GYEONGGI_SOUTH = [
  '수원시', '용인시', '성남시', '화성시', '안양시', '군포시', '의왕시', '과천시', '오산시',
  '평택시', '안산시', '시흥시', '광명시', '부천시', '하남시', '광주시', '이천시',
];
function toStudyZone(address?: string): string | null {
  const [city, district] = (address ?? '').trim().split(/\s+/);
  if (!city) return null;
  if (city.startsWith('서울')) {
    const zone = Object.entries(SEOUL_ZONES).find(([, gus]) =>
      gus.includes(district),
    );
    return zone ? zone[0] : '서울 기타';
  }
  if (city.startsWith('경기')) {
    return GYEONGGI_SOUTH.includes(district) ? '경기 남부' : '경기 북부·동부';
  }
  // "수원시 팔달구"처럼 도 이름 없이 시로 시작하는 주소도 있다.
  if (GYEONGGI_SOUTH.includes(city)) return '경기 남부';
  if (city.startsWith('인천')) return '인천';
  // 수도권 밖(부산·천안 등). 주소가 비어 있으면 위에서 null로 빠진다.
  return '기타 지역';
}

function pickRandomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
const makeDummyProfile = () => ({
  comment: pickRandomFrom(DUMMY_COMMENTS),
  studyIntroduce: {
    subject: pickRandomFrom(DUMMY_SUBJECTS),
    studyStyle: pickRandomFrom(DUMMY_STUDY_STYLES),
    studyTool: pickRandomFrom(DUMMY_STUDY_TOOLS),
  },
});
const DUMMY_NAMES = [
  '김민서',
  '이도윤',
  '박서연',
  '최지호',
  '정하은',
  '강준우',
  '조유진',
  '윤지민',
  '장서준',
  '임수아',
  '한예준',
  '오지아',
  '서현우',
  '신채원',
  '권도현',
  '황다인',
  '안시우',
  '송지유',
  '류건우',
  '홍나연',
  '전은호',
  '고서윤',
  '문하준',
  '양소율',
];
const pickRandom = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

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
    @InjectModel(DB_SCHEMA.USER) private readonly User: Model<IUser>,
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
  /** 스터디 배지 랭킹(이번 달). 상품 구간이 50등까지라 기본 50명. */
  async getStudyBadgeRanking(limit?: number) {
    return await this.userServiceInstance.getStudyBadgeRanking(limit);
  }

  /**
   * 라운지 "지역 멤버" 탭(스터디 크루 대체).
   *
   * 스터디를 한 번이라도 신청한 사람을 신청 주소의 구(예: "강남구") 단위로 묶고, 활동 순으로 정렬한다.
   * 활동 점수 = 신청 수 + 출석 수 × 2, 같으면 최근 활동이 앞. 출석은 확정 스터디 카페의 구로 센다.
   * 이번 주(오늘 이후)에 신청이 있으면 isApplying으로 표시한다. 가짜 신청자도 포함한다
   * (신청 기록이 있으므로). 상세 정보가 아니라 "구마다 누가 있는지" 한눈에 보는 용도라
   * 아바타·이름만 내려 준다.
   */
  async getRegionMembers() {
    // 최근 90일 안에 신청 기록이 있는 사람만(프론트 탭 상단 안내와 같은 기준).
    // 오래전에 한 번 신청하고 떠난 사람까지 넣으면 동네가 실제보다 활발해 보였다.
    const REGION_ACTIVITY_DAYS = 90;
    const today = dayjs().tz('Asia/Seoul').format('YYYY-MM-DD');
    const REGION_ACTIVITY_START = dayjs(today)
      .subtract(REGION_ACTIVITY_DAYS, 'day')
      .format('YYYY-MM-DD');
    const docs = await this.Vote2Repository.getRegionActivityRaw(
      REGION_ACTIVITY_START,
    );

    const toRegion = (address?: string) => toStudyZone(address);

    type Activity = {
      applyCnt: number;
      attendCnt: number;
      lastDate: string;
    };
    // region → userId → 활동
    const byRegion = new Map<string, Map<string, Activity>>();
    const applying = new Set<string>();

    const touch = (regionName: string | null, userId: string, date: string) => {
      if (!regionName || !userId) return null;
      if (!byRegion.has(regionName)) byRegion.set(regionName, new Map());
      const users = byRegion.get(regionName);
      if (!users.has(userId)) {
        users.set(userId, { applyCnt: 0, attendCnt: 0, lastDate: date });
      }
      const activity = users.get(userId);
      if (date > activity.lastDate) activity.lastDate = date;
      return activity;
    };

    for (const doc of docs) {
      for (const participation of doc.participations ?? []) {
        const userId = toId(participation.userId);
        const activity = touch(
          toRegion(participation.locationDetail),
          userId,
          doc.date,
        );
        if (activity) activity.applyCnt += 1;
        if (doc.date >= today) applying.add(userId);
      }
      for (const result of doc.results ?? []) {
        const placeRegion = toRegion(
          (result.placeId as { location?: { address?: string } })?.location
            ?.address,
        );
        for (const member of result.members ?? []) {
          if (!member.arrived || member.absence) continue;
          const activity = touch(placeRegion, toId(member.userId), doc.date);
          if (activity) activity.attendCnt += 1;
        }
      }
    }

    // 모든 지역을 멤버 많은 순으로. 프론트가 "+N"을 누르면 전부 펼치므로 지역별 멤버를 모두 내려 준다
    // (최근 90일 신청자라 수가 많지 않고, 아바타·이름만 보낸다).
    // 순서: 이번 주 신청 중 → 활동 점수(신청 + 출석×2) → 최근 활동.
    const rankedByRegion = Array.from(byRegion.entries())
      .map(([name, users]) => ({
        name,
        count: users.size,
        ranked: Array.from(users.entries())
          .map(([userId, activity]) => ({
            userId,
            lastDate: activity.lastDate,
            score: activity.applyCnt + activity.attendCnt * 2,
            isApplying: applying.has(userId),
          }))
          .sort(
            (a, b) =>
              Number(b.isApplying) - Number(a.isApplying) ||
              b.score - a.score ||
              b.lastDate.localeCompare(a.lastDate),
          ),
      }))
      .sort((a, b) => b.count - a.count);

    const userIds = Array.from(
      new Set(rankedByRegion.flatMap((r) => r.ranked.map((m) => m.userId))),
    );
    const users = await this.User.find({
      _id: { $in: userIds },
      role: { $ne: 'secede' },
    })
      .select('_id name nickname avatar profileImage role uid')
      .lean();
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    // 인원 수는 실제로 내려 주는 멤버(탈퇴 제외) 기준으로 센다. 신청 기록 기준으로 세면
    // 제목은 "29명"인데 펼치면 27명처럼 어긋났다.
    const regions = rankedByRegion
      .map(({ name, ranked }) => {
        const members = ranked
          .filter((m) => userById.has(m.userId))
          .map((m) => ({
            user: userById.get(m.userId),
            isApplying: m.isApplying,
          }));
        return {
          name,
          count: members.length,
          applyingCount: members.filter((m) => m.isApplying).length,
          members,
        };
      })
      .filter((region) => region.count > 0)
      .sort((a, b) => b.count - a.count);

    return { regions };
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

    // 미리보기는 3명부터 조를 만든다. 확정은 4명 기준이지만(doAlgorithm의 reducedCnt),
    // 3명인 조도 하루 사이에 한 명만 더 들어오면 성사되므로 "개설 가능성"으로 보여 준다.
    // 대신 인원이 4명 미만인 카드에는 프론트가 "확정(4명)까지 N명 남았어요"를 함께 적어,
    // 미리보기가 확정으로 오해되지 않게 한다(StudyThumbnailCard).
    const PREVIEW_MIN_GROUP_SIZE = 3;

    const { voteResults } = await this.doAlgorithm(
      participations,
      PREVIEW_MIN_GROUP_SIZE,
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

    await this.withdrawDummiesIfReady(date);

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

  /**
   * 같은 날 realtime과 정규 매칭에 모두 들어간 인원을 한쪽으로만 편성한다.
   *
   * 제외 처리가 없어서 양쪽에 배정될 수 있었고, 한쪽은 자동으로 무단 불참이 되어
   * 다음 날 01:10 배치에서 −2,000P를 맞았다.
   *
   * 규칙: 같은 좌표로 묶인 realtime 스터디가 3명 이상이면 realtime을 우선해
   * 정규 매칭 신청에서 뺀다. 3명 미만이면 정규 매칭을 우선해 realtime 등록을 뺀다.
   *
   * 양쪽에 걸친 사람만 건드린다 — realtime만 한 사람은 그대로 둔다.
   * 3명 미만 그룹에서 인원이 빠지면 남은 사람의 스터디도 줄어들 수 있는데,
   * 애초에 성사되기 어려운 인원이라 정규 매칭으로 보내는 쪽이 낫다고 본다.
   */
  private async resolveRealtimeOverlap(date: string, vote2: Vote2) {
    const REALTIME_PRIORITY_MIN_SIZE = 3;

    const groups = await this.RealtimeService.getPlaceGroups(date);
    if (!groups.length) return;

    const participationIds = new Set(
      (vote2.participations ?? []).map((participation) =>
        toId(participation.userId),
      ),
    );

    const removeFromRealtime: string[] = [];

    for (const group of groups) {
      const overlap = group.userIds.filter((userId) =>
        participationIds.has(toId(userId)),
      );
      if (!overlap.length) continue;

      if (group.userIds.length >= REALTIME_PRIORITY_MIN_SIZE) {
        overlap.forEach((userId) => vote2.removeParticipationByUserId(userId));
      } else {
        removeFromRealtime.push(...overlap);
      }
    }

    await this.RealtimeService.removeUsers(date, removeFromRealtime);
  }

  // ---------- 가짜 신청자(시딩) — 상단 DUMMY_SEED 주석 참고 ----------

  private async getDummyStudyUserIds(): Promise<Set<string>> {
    const users = await this.User.find({
      uid: { $regex: `^${DUMMY_STUDY_UID_PREFIX}` },
    })
      .select('_id')
      .lean();
    return new Set(users.map((user) => user._id.toString()));
  }

  /** 가짜 유저를 POOL_SIZE만큼 확보한다. 날짜마다 새로 만들지 않고 재사용한다. */
  private async ensureDummyStudyPool(): Promise<string[]> {
    const ids = [...(await this.getDummyStudyUserIds())];

    for (let i = ids.length; i < DUMMY_SEED.POOL_SIZE; i++) {
      const year = 95 + Math.floor(Math.random() * 9); // 95~03년생
      const birth = `${String(year % 100).padStart(2, '0')}0${1 + Math.floor(Math.random() * 9)}15`;
      const user = await this.User.create({
        uid: `${DUMMY_STUDY_UID_PREFIX}${randomUUID()}`,
        name: DUMMY_NAMES[i % DUMMY_NAMES.length],
        gender: Math.random() < 0.5 ? '남성' : '여성',
        birth,
        role: 'dummy',
        isActive: false,
        avatar: {
          type: Math.floor(Math.random() * 13),
          bg: Math.floor(Math.random() * 10),
        },
        ...makeDummyProfile(),
      });
      ids.push(user._id.toString());
    }

    // 프로필 없이 만들어진 예전 가짜 유저는 한 번 채운다(이미 채워졌으면 건드리지 않는다).
    const bareDummies = await this.User.find({
      uid: { $regex: `^${DUMMY_STUDY_UID_PREFIX}` },
      $or: [
        { 'studyIntroduce.studyStyle': { $in: ['', null] } },
        { studyIntroduce: { $exists: false } },
      ],
    })
      .select('_id')
      .lean();
    for (const dummy of bareDummies) {
      await this.User.updateOne(
        { _id: dummy._id },
        { $set: makeDummyProfile() },
      );
    }

    return ids;
  }

  /**
   * 지역별 대표 장소와 넣을 가짜 인원.
   *
   * 인기는 최근 LOOKBACK_DAYS 동안 그 장소 POPULARITY_RADIUS_KM 안에 기준점이 있는 실제 신청 수다
   * (날짜·유저 조합 기준, 가짜는 9시에 지워지므로 과거 문서에 없다). 가장 많은 지역이 PER_SPOT_MAX명,
   * 나머지는 비율대로 줄어 신청이 적은 지역은 0명이 될 수 있다.
   */
  private async getDummySeedSpots() {
    const today = DateUtils.getTodayYYYYMMDD();
    const startDay = dayjs(today)
      .subtract(DUMMY_SEED.LOOKBACK_DAYS, 'day')
      .format('YYYY-MM-DD');
    const docs = await this.Vote2Repository.getVoteByPeriod(startDay, today);

    const scored = DUMMY_SEED_REGIONS.map((region) => {
      const applied = new Set<string>();
      for (const doc of docs) {
        for (const participation of doc.participations ?? []) {
          const anchors = Vote2Service.normalizeAnchors(
            participation.anchors,
            participation.latitude,
            participation.longitude,
          );
          const distance = ClusterUtils.minDistanceToAnchors(
            anchors,
            region.latitude,
            region.longitude,
          );
          if (distance <= DUMMY_SEED.POPULARITY_RADIUS_KM) {
            applied.add(`${doc.date}:${toId(participation.userId)}`);
          }
        }
      }
      return { ...region, score: applied.size };
    });

    const maxScore = Math.max(1, ...scored.map((region) => region.score));
    // 실제 신청이 있는 지역 중 상위 ACTIVE_REGION_COUNT곳만 가짜를 받는다.
    const activeNames = new Set(
      [...scored]
        .filter((region) => region.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, DUMMY_SEED.ACTIVE_REGION_COUNT)
        .map((region) => region.name),
    );
    return scored.map((region) => ({
      ...region,
      count: !activeNames.has(region.name)
        ? 0
        : Math.min(
            DUMMY_SEED.PER_SPOT_MAX,
            Math.max(
              DUMMY_SEED.PER_SPOT_MIN,
              Math.round((DUMMY_SEED.PER_SPOT_MAX * region.score) / maxScore),
            ),
          ),
    }));
  }

  /** 가짜 기준점이 이 지점(카페) 위치에 있는가. */
  private static isAnchoredAt(
    anchors: IAnchor[] | undefined,
    spot: { latitude: number; longitude: number },
  ) {
    return (anchors ?? []).some(
      (a) =>
        ClusterUtils.haversineDistance(
          +a.latitude,
          +a.longitude,
          spot.latitude,
          spot.longitude,
        ) < 0.5,
    );
  }

  /**
   * populate된 userId로 가짜 신청자인지 본다. C_SIMPLE_USER에 uid가 들어 있어
   * User를 따로 조회하지 않아도 된다. populate 안 된 값(ObjectId)이면 false.
   */
  private static isStudyDummy(userId: unknown) {
    const uid = (userId as { uid?: string } | null)?.uid;
    return typeof uid === 'string' && uid.startsWith(DUMMY_STUDY_UID_PREFIX);
  }

  /**
   * 내일부터 7일 뒤까지, 지역별 대표 장소의 가짜 신청자를 "원하는 상태"로 맞춘다(매일 00:10 배치).
   *
   * - 지역 i의 단골은 정렬한 풀의 [i×R, (i+1)×R) 구간(R = REGULARS_PER_REGION)으로 고정한다.
   * - 날짜마다 단골 중 count명을 날짜 순번만큼 밀어 가며 고른다. 같은 지역은 같은 얼굴이
   *   자주 겹치고(실제 단골처럼), 지역을 합쳐도 가짜 인원이 지역 수 × R을 넘지 않는다.
   * - 실제 인원만으로 그 근처 조가 만들어지는 날짜·지역은 가짜를 두지 않는다.
   * - 원하는 상태와 다른 가짜(예전 방식으로 들어간 것 포함)는 빼고, 빠진 것만 넣는다.
   * - 오늘은 건드리지 않는다 — 9시에 어차피 지워진다.
   *
   * 날짜는 KST로 직접 만든다. getWeekDate()는 프로세스 TZ를 따라서, 서버가 UTC면
   * 00:10 KST가 전날로 잡혀 오늘에 가짜가 들어간다.
   */
  async seedDummyParticipations() {
    const places = await this.PlaceRepository.findForVote2();
    const spots = await this.getDummySeedSpots();

    const poolIds = (await this.ensureDummyStudyPool()).sort();
    const R = DUMMY_SEED.REGULARS_PER_REGION;
    const todayKst = dayjs().tz('Asia/Seoul');
    const dates = Array.from({ length: 7 }, (_, i) =>
      todayKst.add(i + 1, 'day').format('YYYY-MM-DD'),
    );

    for (const date of dates) {
      // 문서가 없으면 만든다(아직 아무도 조회하지 않은 +7일 등).
      await this.Vote2Repository.findParticipationsByDate(date);
      const vote2 = await this.Vote2Repository.findByDate(date);
      if (!vote2 || vote2.results.length) continue;

      const realParticipations = vote2.participations.filter(
        (p) => !Vote2Service.isStudyDummy(p.userId),
      );
      const dummyParticipations = vote2.participations.filter((p) =>
        Vote2Service.isStudyDummy(p.userId),
      );
      const { voteResults: realGroups } = await this.doAlgorithm(
        realParticipations as unknown as IParticipation[],
        undefined,
        places,
      );

      // 날짜마다 단골을 한 칸씩 밀어서 고른다(dayjs 일수 기준이라 날짜가 같으면 늘 같은 결과).
      const dayIndex = dayjs(date).diff(dayjs('2026-01-01'), 'day');

      const desired = spots.flatMap((spot, regionIdx) => {
        const realGroupNearby = realGroups.some(
          (group) =>
            ClusterUtils.haversineDistance(
              group.center.lat,
              group.center.lon,
              spot.latitude,
              spot.longitude,
            ) <=
            DUMMY_SEED.EPS + 0.1,
        );
        if (realGroupNearby || !spot.count) return [];
        if ((dayIndex + regionIdx) % DUMMY_SEED.DAY_INTERVAL !== 0) return [];

        const regulars = poolIds.slice(regionIdx * R, (regionIdx + 1) * R);
        return Array.from(
          { length: Math.min(spot.count, regulars.length) },
          (_, k) => ({
            userId: regulars[(dayIndex + k) % regulars.length],
            spot,
          }),
        );
      });

      const isWanted = (p: (typeof dummyParticipations)[number]) =>
        desired.some(
          (d) =>
            d.userId === toId(p.userId) &&
            Vote2Service.isAnchoredAt(p.anchors, d.spot),
        );
      const toPull = dummyParticipations
        .filter((p) => !isWanted(p))
        .map((p) => toId(p.userId));

      const kept = new Set(
        dummyParticipations
          .filter((p) => isWanted(p))
          .map((p) => toId(p.userId)),
      );
      const toPush = desired
        .filter((d) => !kept.has(d.userId))
        .map(({ userId, spot }) => ({
          userId,
          latitude: spot.latitude,
          longitude: spot.longitude,
          // 프론트는 locationDetail을 주소로 보고 두 번째 토큰(구)을 지역 배지로 쓴다.
          anchors: [
            {
              latitude: spot.latitude,
              longitude: spot.longitude,
              locationDetail: spot.address,
            },
          ],
          locationDetail: spot.address,
          eps: DUMMY_SEED.EPS,
          isBeforeResult: true,
          // 이 문서 날짜(KST)의 시각으로 바로 만든다(setOrUpdateParticipation의 앵커링과 같은 결과).
          start: getScheduledAtOnDate(
            date,
            pickRandom(DUMMY_SEED.START_HOURS),
          ).toISOString(),
          end: getScheduledAtOnDate(
            date,
            pickRandom(DUMMY_SEED.END_HOURS),
          ).toISOString(),
        }));

      // save()로 문서 전체를 다시 쓰면 그 사이 들어온 신청이 지워질 수 있어 $pull/$push로만 바꾼다.
      await this.Vote2Repository.pullParticipations(date, toPull);
      await this.Vote2Repository.pushParticipations(date, toPush);
    }
  }

  /**
   * 실제 신청자만으로 확정 기준 조가 만들어지면, 그 조 카페에 닿는 가짜 신청자를 뺀다.
   * 신청·시간 변경 직후에 부른다. 실패해도 신청 자체는 성공해야 하므로 에러를 삼킨다.
   */
  private async withdrawDummiesIfReady(date: string) {
    try {
      const vote2 = await this.Vote2Repository.findByDate(date);
      if (!vote2 || vote2.results.length) return;

      const dummyParticipations = vote2.participations.filter((p) =>
        Vote2Service.isStudyDummy(p.userId),
      );
      if (!dummyParticipations.length) return;

      const realParticipations = vote2.participations.filter(
        (p) => !Vote2Service.isStudyDummy(p.userId),
      );
      // defaultStandardCnt를 넘기지 않으면 확정과 같은 기준(5명, 미달 시 4명)이다.
      const { voteResults: realGroups } = await this.doAlgorithm(
        realParticipations as unknown as IParticipation[],
      );
      if (!realGroups.length) return;

      const toRemove = dummyParticipations.filter((p) =>
        realGroups.some(
          (group) =>
            ClusterUtils.minDistanceToAnchors(
              p.anchors ?? [],
              group.center.lat,
              group.center.lon,
            ) <=
            (p.eps ?? DUMMY_SEED.EPS) + 0.1,
        ),
      );

      // save()로 문서 전체를 다시 쓰면 그 사이 들어온 다른 유저의 신청이 지워지거나
      // 취소한 신청이 되살아날 수 있어 $pull로 가짜만 뺀다.
      await this.Vote2Repository.pullParticipations(
        date,
        toRemove.map((p) => toId(p.userId)),
      );
    } catch (err) {
      console.log('withdrawDummiesIfReady failed', err);
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

      // 가짜 신청자는 미리보기용이다. 매칭·배지·알림 어디에도 들어가면 안 되므로
      // 가장 먼저 지운다(아래 save로 함께 저장된다).
      vote2.participations
        .filter((participation) =>
          Vote2Service.isStudyDummy(participation.userId),
        )
        .map((participation) => toId(participation.userId))
        .forEach((userId) => vote2.removeParticipationByUserId(userId));

      // 신청 배지는 realtime 우선으로 빠지기 전 명단으로 준다. realtime 쪽으로
      // 편성됐더라도 정규 매칭 신청은 실제로 했기 때문이다.
      const appliedUserIds = (vote2.participations ?? []).map((participation) =>
        toId(participation.userId),
      );

      if (isToday) {
        await this.resolveRealtimeOverlap(targetDate, vote2);
      }

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

      // 스터디 챌린지 배지 — 신청만 해도 1개(매칭 실패도 포함), 날짜당 1개.
      // 여기서 주면 재신청·취소를 반복해도 그날 명단 기준으로 한 번만 지급된다.
      // 과거 날짜를 다시 계산할 때 중복 지급되지 않도록 오늘만 지급한다.
      if (isToday) {
        for (const userId of appliedUserIds) {
          await this.userServiceInstance.addStudyBadgeById(userId);
        }
      }

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

    // 시간을 바꾸면 겹치는 인원이 생겨 실제 인원만으로 조가 만들어질 수 있다.
    await this.withdrawDummiesIfReady(date);
  }

  async updateResult(date: string, start: string, end: string) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date);

    // 예정 시작 시각이 지난 뒤 시작을 더 뒤로 미루면 지각과 같은 기준으로 차감한다.
    // 이게 없으면 출석 직전에 시간만 미뤄 지각 벌금을 피할 수 있다.
    const lateMinutes = vote.updateResult(token.id, start, end);

    await this.Vote2Repository.save(vote);

    const point = getLatePenalty(lateMinutes);
    if (!point) return;

    const message = '스터디 시작 시간 지연 변경';
    await this.userServiceInstance.updatePoint(point, message);

    return { point, message };
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
    const lateMinutes = vote.getLateMinutes(token.id);
    let point = 0;

    await this.userServiceInstance.updateScore(
      CONST.SCORE.ATTEND_STUDY,
      '스터디 출석',
    );
    await this.userServiceInstance.updateStudyRecord(
      'study',
      getStudyMinutesUntil(end),
    );

    // 스터디 챌린지 배지 — 출석 1개. 중복 출석은 위에서 이미 막혀 있다.
    await this.userServiceInstance.addStudyBadgeById(toId(token.id));

    // 지각 벌금은 늦은 시간에 비례한다(100P + 1시간마다 100P). 신청자·당일 참여자
    // 모두 같은 기준으로 적용한다.
    const latePenalty = getLatePenalty(lateMinutes);
    const lateSuffix = latePenalty ? ' (지각)' : '';

    if (isArriveBefore) {
      point = CONST.POINT.STUDY_ATTEND_BEFORE() + latePenalty;
      const message = `스터디 출석${lateSuffix}`;
      await this.userServiceInstance.updatePoint(point, message, 'study');

      return { point, message };
    } else {
      // 미리 신청하지 않고 당일 합류한 경우. 신청자보다 적게 받는다.
      point = CONST.POINT.STUDY_ATTEND_AFTER() + latePenalty;
      const message = `스터디 당일 참여${lateSuffix}`;
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
