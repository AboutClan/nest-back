import { PRIZE } from 'src/Constants/PRIZE';
import { IPrizeRepository } from '../interfaces/PrizeRepository.interface';
import { Inject, forwardRef } from '@nestjs/common';
import { IPRIZE_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { ENTITY } from 'src/Constants/ENTITY';
import { IUserRepository } from '../../../User/core/interfaces/UserRepository.interface';
import { UserService } from 'src/MSA/User/core/services/user.service';

/**
 * 스터디 스탬프 랭킹을 처음 정산하는 달(YYYY-MM). 스탬프 적립이 2026-09 말에
 * 배포돼 첫 정산(2026-10-01)에는 한 달치 데이터가 없다. 이 경로는 이용권·
 * 기프티콘·포인트를 실제로 지급하므로 검증 전 첫 달은 건너뛴다.
 */
export const STUDY_BADGE_PRIZE_START_MONTH = '2026-11';

export class PrizeService {
  prizeList = PRIZE;
  constructor(
    @Inject(IPRIZE_REPOSITORY)
    private readonly PrizeRepository: IPrizeRepository,
    @Inject(IUSER_REPOSITORY)
    private readonly UserRepository: IUserRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {
    this.prizeList = PRIZE;
  }

  /**
   * 스터디 스탬프 랭킹 월간 정산. 매월 1일, 스탬프 초기화 **전에** 돌려야 한다.
   *
   * - 1~5등: 카공족 이용권 (코드로 지급할 수 없어 당첨 기록만 남기고 운영이 발송)
   * - 6~20등: 커피 기프티콘 (같음)
   * - 21~50등: 500P 자동 지급
   *
   * 순위는 스탬프 수 내림차순, 같으면 먼저 달성한 사람이 상위(lastAt 오름차순).
   */
  async processStudyBadgePrize() {
    const TIERS = [
      { from: 1, to: 5, prize: '카공족 이용권', point: 0 },
      { from: 6, to: 20, prize: '메가커피 기프티콘', point: 0 },
      { from: 21, to: 50, prize: '스터디 랭킹 보상', point: 500 },
    ];

    const ranking = await this.UserRepository.findStudyBadgeRanking(50);
    if (!ranking.length) return;

    for (let idx = 0; idx < ranking.length; idx++) {
      const rank = idx + 1;
      const tier = TIERS.find((t) => rank >= t.from && rank <= t.to);
      if (!tier) continue;

      const userId = (ranking[idx] as any)._id?.toString();
      if (!userId) continue;

      await this.PrizeRepository.recordPrize(
        userId,
        tier.prize,
        new Date(),
        'ranking',
        `월간 스터디 랭킹 ${rank}등`,
      );

      if (tier.point) {
        await this.userService.updatePointById(
          tier.point,
          `월간 스터디 랭킹 ${rank}등 보상`,
          '스터디 랭킹 보상',
          userId,
        );
      }
    }
  }

  async recordMonthPrize(tier: string, userIds: string[]) {
    const prize = this.prizeList[tier];

    for (let i = 0; i < prize.length; i++) {
      const userId = userIds[i];
      const date = new Date();
      const category = 'ranking';
      const description = `월간 ${tier} 상위 ${i + 1}등 상품`;

      if (userId) {
        this.PrizeRepository.recordPrize(
          userId,
          prize[i],
          date,
          category,
          description,
        );
      }
    }
  }

  async getPrizeList(category: string, cursor: string) {
    const cursorNumber = parseInt(cursor, 10) || 0;

    return this.PrizeRepository.findPrizes(category, cursorNumber);
  }

  async addRandomRoulette(userId: string, gift: string) {
    await this.PrizeRepository.recordPrize(userId, gift.toString(), new Date(), 'randomRoulette', '랜덤 룰렛 보상');
  }

  async processMonthPrize() {
    //processMonthScore와 processMonthPrize 과정 합쳐야 할 부분 존재
    const ranks = ENTITY.USER.ENUM_RANK;

    const top5 = await this.UserRepository.findMonthPrize(
      ranks as unknown as any[],
    );

    for (const rank of ranks) {
      const top5UserIds = top5[rank].map((user) => user._id.toString());
      this.recordMonthPrize(rank, top5UserIds);

      if (rank === ENTITY.USER.RANK_SILVER) {
        const pointList = [3000, 2000, 1000, 1000, 100];
        for (let i = 0; i < top5UserIds.length; i++) {
          const userId = top5UserIds[i];
          const point = pointList[i] || 1000; // 기본값 1000
          await this.userService.updatePointById(
            point,
            `월간 ${rank} 등수 보상`,
            '월간 점수 보상',
            userId,
          );
        }
      } else if (rank === ENTITY.USER.RANK_BRONZE) {
        const pointList = [3000, 2000, 1000, 1000, 1000];
        for (let i = 0; i < top5UserIds.length; i++) {
          const userId = top5UserIds[i];
          const point = pointList[i] || 1000; // 기본값 1000
          await this.userService.updatePointById(
            point,
            `월간 ${rank} 등수 보상`,
            '월간 점수 보상',
            userId,
          );
        }
      }
    }

    const users = await this.UserRepository.findAllForPrize();

    // temperature.temperature가 높은 상위 5명
    const top5ByTemperature = [...users]
      .sort((a, b) => b.temperature.temperature - a.temperature.temperature)
      .slice(0, 5);

    // studyRecord.accumulationCnt * 3 + studyRecord.accumulationMinutes가 높은 상위 5명
    const top5ByStudyRecord = [...users]
      .sort((a, b) => {
        const scoreA =
          (a.studyRecord?.accumulationCnt || 0) * 3 +
          (a.studyRecord?.accumulationMinutes || 0);
        const scoreB =
          (b.studyRecord?.accumulationCnt || 0) * 3 +
          (b.studyRecord?.accumulationMinutes || 0);
        return scoreB - scoreA;
      })
      .slice(0, 5);

    const top5TemperatureUserIds = top5ByTemperature.map((user) =>
      user._id.toString(),
    );
    const top5StudyUserIds = top5ByStudyRecord.map((user) =>
      user._id.toString(),
    );

    const pointList = [5000, 3000, 1000, 1000, 1000];
    for (let i = 0; i < top5TemperatureUserIds.length; i++) {
      const userId = top5TemperatureUserIds[i];
      const point = pointList[i] || 1000; // 기본값 1000
      await this.userService.updatePointById(
        point,
        `월간 ${ENTITY.USER.RANK_TEMPERATURE} 등수 보상`,
        '월간 점수 보상',
        userId,
      );
    }
    for (let i = 0; i < top5StudyUserIds.length; i++) {
      const userId = top5StudyUserIds[i];
      const point = pointList[i] || 1000; // 기본값 1000
      await this.userService.updatePointById(
        point,
        `월간 ${ENTITY.USER.RANK_STUDY} 등수 보상`,
        '월간 점수 보상',
        userId,
      );
    }
    this.recordMonthPrize(ENTITY.USER.RANK_TEMPERATURE, top5TemperatureUserIds);
    this.recordMonthPrize(ENTITY.USER.RANK_STUDY, top5StudyUserIds);
  }
}
