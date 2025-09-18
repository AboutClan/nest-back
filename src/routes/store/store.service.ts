import { Store } from 'src/domain/entities/Store/Store';
import { CreateStoreDto } from './store.dto';
import { IStoreRepository } from './StoreRepository.interface';
import { STORE_GIFT_ACTIVE, STORE_GIFT_INACTIVE } from './data';
import { Inject } from '@nestjs/common';
import { ISTORE_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { RequestContext } from 'src/request-context';
import { IUserRepository } from '../user/UserRepository.interface';
import { logger } from 'src/logger';

export class StoreService {
  constructor(
    @Inject(ISTORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
    @Inject(IUSER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async getStores(status: string, cursor: number) {
    if (status === 'pending') {
      return this.storeRepository.getStores(['pending', 'processed'], cursor);
    } else if (status === 'processed') {
      return this.storeRepository.getStores(['end'], cursor);
    }
  }
  async getStoreById(id: string) {
    return this.storeRepository.getStoreById(id);
  }

  async createStore(storeInfo: CreateStoreDto) {
    const store = new Store({
      ...storeInfo,
      applicants: [],
      winner: [],
    });

    return this.storeRepository.create(store);
  }

  async voteStore(storeId: string, cnt: number) {
    const token = RequestContext.getDecodedToken();

    const store = await this.storeRepository.getStoreById(storeId);
    if (!store) {
      throw new Error('Store not found');
    }
    if (store.status === 'processed') {
      throw new Error('Store is already processed');
    }

    const votedCnt = store.addApplicant(token.id, cnt);
    const updatePoint = store.point * votedCnt;

    const user = await this.userRepository.findById(token.id);
    if (user.point - updatePoint < 8000) {
      throw new Error('Point is not enough');
    }

    user.increasePoint(-updatePoint);
    await this.userRepository.save(user);

    logger.logger.info('store vote', {
      type: 'point',
      sub: null,
      uid: token.uid,
      value: -updatePoint,
    });

    if (votedCnt != cnt) {
      store.announceWinner();
    }

    return await this.storeRepository.save(store);
  }

  async test() {
    const actives = STORE_GIFT_ACTIVE;
    const inactives = STORE_GIFT_INACTIVE;

    for (const active of actives) {
      const store = new Store({
        name: active.name,
        image: active.image,
        point: active.point,
        winnerCnt: active.winner,
        max: active.max,
        status: 'pending',
        applicants: [],
        winner: [],
      });
      await this.storeRepository.create(store);
    }

    for (const inactive of inactives) {
      const store = new Store({
        name: inactive.name,
        image: inactive.image,
        point: inactive.point,
        winnerCnt: inactive.winner,
        max: inactive.max,
        status: 'end',
        applicants: [],
        winner: [],
      });
      await this.storeRepository.create(store);
    }
  }
}
