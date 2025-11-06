import { Inject } from '@nestjs/common';
import { DailyCheck } from 'src/domain/entities/DailyCheck';
import { RequestContext } from 'src/request-context';
import { CollectionService } from 'src/routes/collection/collection.service';
import { UserService } from 'src/routes/user/user.service';
import { IDAILYCHECK_REPOSITORY } from 'src/utils/di.tokens';
import { IDailyCheckRepository } from './DailyCheckRepository.interface';
export class DailyCheckService {
  constructor(
    @Inject(IDAILYCHECK_REPOSITORY)
    private readonly dailyCheckRepository: IDailyCheckRepository,
    private readonly collectionServiceInstance: CollectionService,
    private readonly userService: UserService,
  ) {}

  async setDailyCheck() {
    const token = RequestContext.getDecodedToken();

    const findDailyCheck = await this.dailyCheckRepository.findByUid(token.uid);

    if (findDailyCheck?.updatedAt) {
      const today = new Date();
      const updatedAt = findDailyCheck.updatedAt
        ? new Date(findDailyCheck.updatedAt)
        : null;

      if (updatedAt && today.toDateString() === updatedAt.toDateString()) {
        return;
      }
    }

    const newDailyCheck = new DailyCheck({
      uid: token.uid,
      name: token.name,
    });

    await this.dailyCheckRepository.create(newDailyCheck);

    const data = await this.collectionServiceInstance.setCollectionStamp(
      token.id,
    );

    return data;
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
