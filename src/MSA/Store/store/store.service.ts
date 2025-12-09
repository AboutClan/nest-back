import { Inject } from '@nestjs/common';
import { Applicant } from 'src/domain/entities/Store/Applicant';
import { Store } from 'src/domain/entities/Store/Store';
import { logger } from 'src/logger';
import { RequestContext } from 'src/request-context';
import {
  IGIFT_REPOSITORY,
  IPRIZE_REPOSITORY,
  ISTORE_REPOSITORY,
  IUSER_REPOSITORY,
} from 'src/utils/di.tokens';
import { GiftRepository } from '../../../routes/gift/gift.repository.interface';
import { IUserRepository } from '../../User/user/UserRepository.interface';
import { STORE_GIFT_ACTIVE, STORE_GIFT_INACTIVE } from './data';
import { CreateStoreDto } from './store.dto';
import { IStoreRepository } from './StoreRepository.interface';
import { IPrizeRepository } from '../prize/PrizeRepository.interface';

export class StoreService {
  constructor(
    @Inject(ISTORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
    @Inject(IUSER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(IGIFT_REPOSITORY)
    private readonly giftRepository: GiftRepository,
    @Inject(IPRIZE_REPOSITORY)
    private readonly prizeRepository: IPrizeRepository,
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
    if (votedCnt === 0) throw new Error('Already full');
    const updatePoint = store.point * votedCnt;

    const user = await this.userRepository.findById(token.id);
    if (user.point - updatePoint < 8000) {
      throw new Error('Point is not enough');
    }

    user.increasePoint(-updatePoint);
    await this.userRepository.save(user);

    logger.info('스토어 상품 응모', {
      type: 'point',
      sub: null,
      uid: token.uid,
      value: -updatePoint,
    });

    let winners = [];
    if (store.calcTotalVote() >= store.max) {
      winners = store.announceWinner();
    }

    await this.storeRepository.save(store);

    for (const winner of winners) {
      await this.prizeRepository.recordPrize(
        winner,
        store.name,
        new Date(),
        'store',
        '스토어 응모 상품 당첨',
      );
    }

    return;
  }

  // async test() {
  //   const stores = await this.storeRepository.findAll();
  //   for (const store of stores) {
  //     const winners = this.selectRandomWinners(
  //       store.max,
  //       store.winnerCnt,
  //       store._id as any,
  //     );

  //     const voteCnt = store.applicants.reduce((acc, applicant) => {
  //       acc += applicant.cnt;
  //       return acc;
  //     }, 0);

  //     console.log(winners);

  //     if (voteCnt >= store.max) {
  //       store.winner = winners.map((winner) => winner.toString());
  //       await this.storeRepository.save(store);
  //     }
  //   }
  // }

  // selectRandomWinners(item.max, item.winner, item.giftId)

  selectRandomWinners = (
    total: number,
    winner: number,
    uniqueNumber: number,
  ): number[] => {
    function hashStringToInt(s, max) {
      let hash = 0;
      for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }

      return Math.abs(hash) % max;
    }
    const winners = new Set<number>();
    let seedStr = uniqueNumber.toString();

    while (winners.size < winner) {
      const hashValue = hashStringToInt(seedStr, total);
      if (!winners.has(hashValue)) {
        winners.add(hashValue);
      }
      seedStr += winner.toString();
    }

    return Array.from(winners);
  };

  async test() {
    const stores = await this.storeRepository.findAll();

    for (const store of stores) {
      store.point = store.point * 10;
      await this.storeRepository.save(store);
    }
  }
}
