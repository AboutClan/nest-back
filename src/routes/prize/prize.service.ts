import { PRIZE } from 'src/Constants/PRIZE';
import { IPrizeRepository } from './PrizeRepository.interface';
import { Inject } from '@nestjs/common';
import { IPRIZE_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { ENTITY } from 'src/Constants/ENTITY';
import { IUserRepository } from '../user/UserRepository.interface';
import { UserService } from '../user/user.service';

export class PrizeService {
  prizeList = PRIZE;
  constructor(
    @Inject(IPRIZE_REPOSITORY)
    private readonly PrizeRepository: IPrizeRepository,
    @Inject(IUSER_REPOSITORY)
    private readonly UserRepository: IUserRepository,
    private readonly userService: UserService,
  ) {
    this.prizeList = PRIZE;
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
