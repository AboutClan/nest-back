import { Inject } from '@nestjs/common';
import { Applicant } from 'src/domain/entities/Store/Applicant';
import { Store } from 'src/domain/entities/Store/Store';
import { logger } from 'src/logger';
import { RequestContext } from 'src/request-context';
import {
  IGIFT_REPOSITORY,
  ISTORE_REPOSITORY,
  IUSER_REPOSITORY,
} from 'src/utils/di.tokens';
import { GiftRepository } from '../gift/gift.repository.interface';
import { IUserRepository } from '../user/UserRepository.interface';
import { STORE_GIFT_ACTIVE, STORE_GIFT_INACTIVE } from './data';
import { CreateStoreDto } from './store.dto';
import { IStoreRepository } from './StoreRepository.interface';

export class StoreService {
  constructor(
    @Inject(ISTORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
    @Inject(IUSER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(IGIFT_REPOSITORY)
    private readonly giftRepository: GiftRepository,
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
    console.log(storeId, cnt);
    const store = await this.storeRepository.getStoreById(storeId);
    console.log(54, store);
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
    const actives = STORE_GIFT_ACTIVE;
    const inactives = STORE_GIFT_INACTIVE;

    const allGifts = await this.giftRepository.findAllSort();

    // user가 존재하는 gifts만 필터링하고 uid를 _id로 변환
    const gifts = [];
    for (const gift of allGifts) {
      const user = await this.userRepository.findByUid(gift.uid);
      if (!user?._id) {
        continue;
      }
      gifts.push({
        ...gift,
        userId: user._id,
      });
    }

    // giftId별로 gifts를 그룹화
    const giftsByGiftId = gifts.reduce((acc, gift) => {
      if (!acc[gift.giftId]) {
        acc[gift.giftId] = [];
      }
      acc[gift.giftId].push(gift);
      return acc;
    }, {});

    for (const active of actives) {
      // 해당 giftId에 해당하는 gifts 찾기
      const matchingGifts = giftsByGiftId[active.giftId] || [];

      // uid별로 cnt 합산 (uid로 비교)
      const applicantsMap = new Map();
      matchingGifts.forEach((gift) => {
        const existingCnt = applicantsMap.get(gift.uid) || 0;
        applicantsMap.set(gift.uid, existingCnt + gift.cnt);
      });

      // userId를 cnt 개수만큼 중복으로 넣은 배열 생성
      const userIdArray = [];
      Array.from(applicantsMap.entries()).forEach(([uid, cnt]) => {
        const matchingGift = matchingGifts.find((g) => g.uid === uid);
        for (let i = 0; i < cnt; i++) {
          userIdArray.push(matchingGift.userId);
        }
      });

      if (userIdArray.length < active.max) {
        continue;
      }
      const winners = this.selectRandomWinners(
        userIdArray.length, // 전체 참여자 수 (중복 포함)
        active.winner,
        active.giftId,
      ).map((winner) => {
        return userIdArray[winner]; // return 추가
      });

      console.log(winners);
    }

    for (const inactive of inactives) {
      // 해당 giftId에 해당하는 gifts 찾기
      const matchingGifts = giftsByGiftId[inactive.giftId] || [];

      // uid별로 cnt 합산 (uid로 비교)
      const applicantsMap = new Map();
      matchingGifts.forEach((gift) => {
        const existingCnt = applicantsMap.get(gift.uid) || 0;
        applicantsMap.set(gift.uid, existingCnt + gift.cnt);
      });

      // userId를 cnt 개수만큼 중복으로 넣은 배열 생성
      const userIdArray = [];
      Array.from(applicantsMap.entries()).forEach(([uid, cnt]) => {
        const matchingGift = matchingGifts.find((g) => g.uid === uid);
        for (let i = 0; i < cnt; i++) {
          userIdArray.push(matchingGift.userId);
        }
      });

      if (userIdArray.length < inactive.max) {
        continue;
      }
      const winners = this.selectRandomWinners(
        userIdArray.length, // 전체 참여자 수 (중복 포함)
        inactive.winner,
        inactive.giftId,
      ).map((winner) => {
        return userIdArray[winner]; // return 추가
      });

      console.log(winners);
    }
  }

  async testWithStore() {
    const actives = STORE_GIFT_ACTIVE;
    const inactives = STORE_GIFT_INACTIVE;

    const allGifts = await this.giftRepository.findAllSort();

    // user가 존재하는 gifts만 필터링하고 uid를 _id로 변환
    const gifts = [];
    for (const gift of allGifts) {
      const user = await this.userRepository.findByUid(gift.uid);
      if (!user?._id) {
        continue;
      }
      gifts.push({
        ...gift,
        userId: user._id,
      });
    }

    // giftId별로 gifts를 그룹화
    const giftsByGiftId = gifts.reduce((acc, gift) => {
      if (!acc[gift.giftId]) {
        acc[gift.giftId] = [];
      }
      acc[gift.giftId].push(gift);
      return acc;
    }, {});

    for (const active of actives) {
      // 해당 giftId에 해당하는 gifts 찾기
      const matchingGifts = giftsByGiftId[active.giftId] || [];

      // uid별로 cnt 합산 (uid로 비교)
      const applicantsMap = new Map();
      matchingGifts.forEach((gift) => {
        const existingCnt = applicantsMap.get(gift.uid) || 0;
        applicantsMap.set(gift.uid, existingCnt + gift.cnt);
      });

      // userId를 cnt 개수만큼 중복으로 넣은 배열 생성
      const userIdArray = [];
      Array.from(applicantsMap.entries()).forEach(([uid, cnt]) => {
        const matchingGift = matchingGifts.find((g) => g.uid === uid);
        for (let i = 0; i < cnt; i++) {
          userIdArray.push(matchingGift.userId);
        }
      });

      // applicants 배열 생성 (userId로 저장)
      const applicants = Array.from(applicantsMap.entries()).map(
        ([uid, cnt]) => {
          // 해당 uid에 매칭되는 gift에서 userId 찾기
          const matchingGift = matchingGifts.find((g) => g.uid === uid);
          return new Applicant({
            user: matchingGift.userId,
            cnt: cnt,
          });
        },
      );

      // 당첨자 선택 로직
      let winners = [];
      if (userIdArray.length >= active.max) {
        const winnerIndices = this.selectRandomWinners(
          userIdArray.length,
          active.winner,
          active.giftId,
        );
        winners = winnerIndices.map((index) => userIdArray[index]);
      }

      const store = new Store({
        name: active.name,
        image: active.image,
        point: active.point,
        winnerCnt: active.winner,
        max: active.max,
        status: 'pending',
        applicants: applicants,
        winner: winners,
      });
      await this.storeRepository.create(store);
    }

    for (const inactive of inactives) {
      // 해당 giftId에 해당하는 gifts 찾기
      const matchingGifts = giftsByGiftId[inactive.giftId] || [];

      // uid별로 cnt 합산 (uid로 비교)
      const applicantsMap = new Map();
      matchingGifts.forEach((gift) => {
        const existingCnt = applicantsMap.get(gift.uid) || 0;
        applicantsMap.set(gift.uid, existingCnt + gift.cnt);
      });

      // userId를 cnt 개수만큼 중복으로 넣은 배열 생성
      const userIdArray = [];
      Array.from(applicantsMap.entries()).forEach(([uid, cnt]) => {
        const matchingGift = matchingGifts.find((g) => g.uid === uid);
        for (let i = 0; i < cnt; i++) {
          userIdArray.push(matchingGift.userId);
        }
      });

      // applicants 배열 생성 (userId로 저장)
      const applicants = Array.from(applicantsMap.entries()).map(
        ([uid, cnt]) => {
          // 해당 uid에 매칭되는 gift에서 userId 찾기
          const matchingGift = matchingGifts.find((g) => g.uid === uid);
          return new Applicant({
            user: matchingGift.userId,
            cnt: cnt,
          });
        },
      );

      // 당첨자 선택 로직
      let winners = [];
      if (userIdArray.length >= inactive.max) {
        const winnerIndices = this.selectRandomWinners(
          userIdArray.length,
          inactive.winner,
          inactive.giftId,
        );
        winners = winnerIndices.map((index) => userIdArray[index]);
      }

      const store = new Store({
        name: inactive.name,
        image: inactive.image,
        point: inactive.point,
        winnerCnt: inactive.winner,
        max: inactive.max,
        status: 'end',
        applicants: applicants,
        winner: winners,
      });
      await this.storeRepository.create(store);
    }
  }
}
