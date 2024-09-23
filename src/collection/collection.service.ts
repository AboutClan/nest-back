import { Injectable } from '@nestjs/common';
import { JWT } from 'next-auth/jwt';
import {
  Collection,
  CollectionZodSchema,
  ICollection,
} from './entity/collection.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class CollectionService {
  private token: JWT;
  private ALPHABET_COLLECTION = ['A', 'B', 'O', 'U', 'T'];
  constructor(
    @InjectModel('Collection') private Collection: Model<ICollection>,
    token?: JWT,
  ) {
    this.token = token as JWT;
  }

  async setCollection(alphabet: string) {
    const validatedCollection = CollectionZodSchema.parse({
      user: this.token.id,
      collects: [alphabet],
      collectCnt: 0,
    });

    await Collection.findOneAndUpdate(
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

  async changeCollection(
    mine: string,
    opponent: string,
    myId: string,
    toUid: string,
  ) {
    //todo: User 의존성
    const findToUser = await User.findOne({ uid: toUid });
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

  async setCollectionCompleted() {
    const previousData = await Collection.findOne({ user: this.token.id });
    const myAlphabets = previousData?.collects?.length
      ? [...previousData?.collects]
      : null;
    if (ALPHABET_COLLECTION.every((item) => myAlphabets?.includes(item))) {
      ALPHABET_COLLECTION.forEach((item) => {
        const idx = myAlphabets?.indexOf(item);
        if (idx !== -1) myAlphabets?.splice(idx as number, 1);
      });
      await Collection.updateOne(
        { user: this.token.id },
        { $set: { collects: myAlphabets }, $inc: { collectCnt: 1 } },
      );
      await Request.create({
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
    const result = await Collection.findOne({ user: this.token.id })
      .populate('user')
      .select('-_id');
    return result;
  }

  async getCollectionAll() {
    const result = await Collection.find({}, '-_id -__v').populate('user');
    return result;
  }
}
