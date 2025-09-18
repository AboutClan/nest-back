import { Inject } from '@nestjs/common';
import { Store } from 'src/domain/entities/Store/Store';
import { ISTORE_REPOSITORY } from 'src/utils/di.tokens';
import { STORE_GIFT_ACTIVE, STORE_GIFT_INACTIVE } from './data';
import { CreateStoreDto } from './store.dto';
import { IStoreRepository } from './StoreRepository.interface';

export class StoreService {
  constructor(
    @Inject(ISTORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
  ) {}

  async getStores(status: string, cursor: number) {
    if (status === 'pending') {
      return this.storeRepository.getStores(['pending', 'processed'], cursor);
    } else if (status === 'end') {
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
