import { Inject, Injectable } from '@nestjs/common';
import { JWT } from 'next-auth/jwt';
import {
  Collection,
  CollectionZodSchema,
  ICollection,
} from './entity/collection.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from 'src/user/entity/user.entity';
import { ALPHABET_COLLECTION } from 'src/constants';
import { IRequestData } from 'src/request/entity/request.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class CollectionService {
  private token: JWT;
  constructor(
    @InjectModel('collection') private Collection: Model<ICollection>,
    @InjectModel('Request') private Request: Model<IRequestData>,
    @InjectModel('User') private User: Model<IUser>,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async setCollectionStamp(id: string) {
    const validatedCollection = CollectionZodSchema.parse({
      user: id,
      type: 'alphabet',
      collects: [],
      collectCnt: 0,
      stamps: 0,
    });
    const currentCollection = await this.Collection.findOne({
      user: id,
    });
    const currentStamps = currentCollection?.stamps ?? 0;

    let updatedStamps = currentStamps;
    let updatedAlphabet = null;

    if (currentStamps < 5) {
      if (!currentCollection) {
        // 문서가 없으면 새로 생성
        await this.Collection.create(validatedCollection);
      } else {
        // 문서가 있으면 stamps 증가
        await this.Collection.findOneAndUpdate(
          { user: id },
          { $inc: { stamps: 1 } },
          { new: true },
        );
      }

      updatedStamps++;
    }

    const getRandomAlphabet = (percent: number) => {
      const randomValue = Math.random();

      if (randomValue <= percent / 100) {
        const randomIdx = Math.floor(Math.random() * 5);
        const alphabet = ALPHABET_COLLECTION[randomIdx];
        return alphabet;
      }
      return null;
    };
    // stamps가 5인 경우에만 alphabet을 추가합니다
    if (currentCollection?.stamps === 4) {
      const alphabet = getRandomAlphabet(20);
      // stamps가 4인 경우 1 증가 후 5가 되므로 alphabet을 추가
      await this.Collection.findOneAndUpdate(
        { user: id },
        {
          $push: { collects: alphabet }, // alphabet을 collects 배열에 추가
          $inc: { collectCnt: 1 }, // collectCnt 값을 1 증가
          $set: { stamps: 0 },
        },
        { new: true },
      );
      updatedAlphabet = alphabet;
      updatedStamps = 0;
    }

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
    const findToUser = await this.User.findOne({ uid: toUid });
    const myAlphabets = await this.Collection.findOne({ user: myId });
    const opponentAlphabets = await this.Collection.findOne({
      user: findToUser?._id,
    });

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

    await this.Collection.findOneAndUpdate(
      { user: this.token.id },
      {
        $push: { collects: alphabet },
        $setOnInsert: {
          user: validatedCollection.user,
          collectCnt: validatedCollection.collectCnt,
        },
      },
      { upsert: true, new: true },
    );
    return null;
  }

  async setCollectionCompleted() {
    const previousData = await this.Collection.findOne({ user: this.token.id });
    const myAlphabets = previousData?.collects?.length
      ? [...previousData?.collects]
      : null;
    if (ALPHABET_COLLECTION.every((item) => myAlphabets?.includes(item))) {
      ALPHABET_COLLECTION.forEach((item) => {
        const idx = myAlphabets?.indexOf(item);
        if (idx !== -1) myAlphabets?.splice(idx as number, 1);
      });
      await this.Collection.updateOne(
        { user: this.token.id },
        { $set: { collects: myAlphabets }, $inc: { collectCnt: 1 } },
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
    const result = await this.Collection.findOne({ user: this.token.id })
      .populate('user')
      .select('-_id');
    return result;
  }

  async getCollectionAll() {
    const result = await this.Collection.find({}, '-_id -__v').populate('user');
    return result;
  }
}
