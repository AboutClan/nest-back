import { Inject, Injectable } from '@nestjs/common';
import { JWT } from 'next-auth/jwt';
import { CollectionZodSchema } from './entity/collection.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ALPHABET_COLLECTION } from 'src/constants';
import { IRequestData } from 'src/request/entity/request.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { ICollectionService } from './collectionService.interface';
import { CollectionRepository } from './collection.repository.interface';
import { ICOLLECTION_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { UserRepository } from 'src/user/user.repository.interface';

@Injectable()
export class CollectionService implements ICollectionService {
  private token: JWT;
  constructor(
    @InjectModel('Request') private Request: Model<IRequestData>,
    @Inject(IUSER_REPOSITORY)
    private readonly UserRepository: UserRepository,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
    @Inject(ICOLLECTION_REPOSITORY)
    private readonly collectionRepository: CollectionRepository,
  ) {
    this.token = this.request.decodedToken;
  }

  async setCollectionStamp(id: string) {
    const currentCollection = await this.collectionRepository.findByUser(id);
    const currentStamps = currentCollection?.stamps ?? 0;

    if (currentStamps < 5) {
      if (!currentCollection) {
        const validatedCollection = CollectionZodSchema.parse({
          user: id,
        });
        // 문서가 없으면 새로 생성
        await this.collectionRepository.createCollection(validatedCollection);
      } else {
        // 문서가 있으면 stamps 증가
        await this.collectionRepository.increateStamp(id);
      }
    }

    const updatedStamps = currentStamps < 4 ? currentStamps + 1 : 0;
    const updatedAlphabet =
      currentStamps === 4
        ? ALPHABET_COLLECTION[Math.floor(Math.random() * 5)]
        : null;

    // stamps가 5인 경우에만 alphabet을 추가합니다
    // stamps가 4인 경우 1 증가 후 5가 되므로 alphabet을 추가
    await this.collectionRepository.setRandomAlphabet(id, updatedAlphabet);

    return {
      alphabet: updatedAlphabet, // alphabet을 얻었으면 반환하고, 그렇지 않으면 null
      stamps: updatedStamps, // 현재 stamps에서 1 증가한 값 반환
    };
  }

  async changeCollection(
    mine: string,
    opponent: string,
    myId: string,
    toUid: string,
  ) {
    //todo: User 의존성
    const findToUser = await this.UserRepository.findByUid(toUid);
    const myAlphabets = await this.collectionRepository.findByUser(myId);
    const opponentAlphabets = await this.collectionRepository.findByUser(
      findToUser?._id,
    );

    if (!myAlphabets?.collects?.includes(mine)) {
      return '해당 알파벳을 보유하고 있지 않습니다.';
    }
    if (!opponentAlphabets?.collects?.includes(opponent)) {
      return '상대가 해당 알파벳을 보유중이지 않습니다.';
    }
    const myCollects = myAlphabets?.collects;
    const opponentCollects = opponentAlphabets?.collects;

    const myIdx = myCollects?.indexOf(mine);
    const opponentIdx = opponentCollects?.indexOf(opponent);
    myCollects?.splice(myIdx, 1);
    opponentCollects?.splice(opponentIdx, 1);
    myCollects?.push(opponent);
    opponentCollects?.push(mine);
    await myAlphabets?.save();
    await opponentAlphabets?.save();

    return null;
  }

  async setCollection(alphabet: string) {
    const validatedCollection = CollectionZodSchema.parse({
      user: this.token.id,
      collects: [alphabet],
      collectCnt: 0,
    });

    await this.collectionRepository.setCollection(
      alphabet,
      this.token.id,
      validatedCollection.collectCnt,
    );

    return null;
  }

  async setCollectionCompleted() {
    const previousData = await this.collectionRepository.findByUser(
      this.token.id,
    );
    const myAlphabets = previousData?.collects?.length
      ? [...previousData?.collects]
      : null;
    if (ALPHABET_COLLECTION.every((item) => myAlphabets?.includes(item))) {
      ALPHABET_COLLECTION.forEach((item) => {
        const idx = myAlphabets?.indexOf(item);
        if (idx !== -1) myAlphabets?.splice(idx as number, 1);
      });
      await this.collectionRepository.updateCollection(
        this.token.id,
        myAlphabets,
      );
      await this.Request.create({
        category: '건의',
        title: '알파벳 완성',
        writer: this.token.name,
        content: `${this.token.name}/${
          previousData?.collectCnt ? previousData.collectCnt + 1 : 0
        }`,
      });
    } else {
      return 'not completed';
    }
  }

  async getCollection() {
    const result = this.collectionRepository.findByUserPop(this.token.id);
    return result;
  }

  async getCollectionAll() {
    const result = await this.collectionRepository.findAll();
    return result;
  }
}
