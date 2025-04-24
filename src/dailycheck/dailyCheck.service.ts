import { Inject } from '@nestjs/common';
import { DailyCheck } from 'src/domain/entities/DailyCheck';
import { RequestContext } from 'src/request-context';
import { UserService } from 'src/user/user.service';
import { IDAILYCHECK_REPOSITORY } from 'src/utils/di.tokens';
import { IDailyCheckRepository } from './DailyCheckRepository.interface';

export class DailyCheckService {
  constructor(
    @Inject(IDAILYCHECK_REPOSITORY)
    private readonly dailyCheckRepository: IDailyCheckRepository,
    private readonly userService: UserService,
  ) {}

  async setDailyCheck() {
    const token = RequestContext.getDecodedToken();

    const findDailyCheck = await this.dailyCheckRepository.findByUid(token.uid);

    if (findDailyCheck.updatedAt) {
      const today = new Date();
      const updatedAt = findDailyCheck.updatedAt
        ? new Date(findDailyCheck.updatedAt)
        : null;

      if (updatedAt && today.toDateString() === updatedAt.toDateString()) {
        return '이미 출석체크를 완료했습니다.';
      }
    }

    const newDailyCheck = new DailyCheck({
      uid: token.uid,
      name: token.name,
    });

    await this.dailyCheckRepository.create(newDailyCheck);
    return;
  }

  async getLog() {
    const token = RequestContext.getDecodedToken();

    const result = await this.dailyCheckRepository.findByUid(token.uid);
    return result.toPrimitives();
  }

  async getAllLog() {
    return (await this.dailyCheckRepository.findAll()).map((data) =>
      data.toPrimitives(),
    );
  }
}
