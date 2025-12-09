import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { Collection } from 'src/domain/entities/Collection';
import { RequestContext } from 'src/request-context';
import { IRequestData } from 'src/MSA/User/request/request.entity';
import { ICOLLECTION_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { FcmService } from '../../MSA/Notification/fcm/fcm.service';
import { UserRepository } from '../../MSA/User/user/UserRepository';
import { ICollectionRepository } from './CollectionRepository.interface';

@Injectable()
export class CollectionService {
  constructor(
    @InjectModel(DB_SCHEMA.REQUEST) private Request: Model<IRequestData>,
    @Inject(IUSER_REPOSITORY)
    private readonly UserRepository: UserRepository,
    @Inject(ICOLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,

    private readonly fcmServiceInstance: FcmService,
  ) {}

  async setCollectionStamp(id: string) {
    let currentCollection = await this.collectionRepository.findByUser(id);

    if (!currentCollection) {
      const newCollection = new Collection({ user: id });
      currentCollection = newCollection;
      currentCollection.increaseStamp();
    } else if (currentCollection.stamps < 5) {
      currentCollection.increaseStamp();
    }

    let updatedAlphabet: string | null = null;
    if (currentCollection.stamps >= 5) {
      const pool = ENTITY.COLLECTION.ENUM_ALPHABET;
      updatedAlphabet = pool[Math.floor(Math.random() * pool.length)]; // 길이 하드코딩 제거
      currentCollection.addAlphabet(updatedAlphabet);
      currentCollection.stamps = 0;
    }

    await this.collectionRepository.save(currentCollection);

    return {
      alphabet: updatedAlphabet, // 임계 도달 시 문자열, 아니면 null
      stamps: currentCollection.stamps, // 최종 스탬프 값(초기화 후 0 또는 증가값)
    };
  }

  //알파벳 교환
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

    myAlphabets.removeAlphabet(mine);
    opponentAlphabets.removeAlphabet(opponent);

    myAlphabets.addAlphabet(opponent);
    opponentAlphabets.addAlphabet(mine);

    await this.collectionRepository.save(myAlphabets);
    await this.collectionRepository.save(opponentAlphabets);

    await this.fcmServiceInstance.sendNotificationToX(
      toUid,
      WEBPUSH_MSG.COLLECTION.CHANGE_TITLE,
      WEBPUSH_MSG.COLLECTION.CHANGE_DESC,
    );

    return null;
  }

  async setCollection(alphabet: string) {
    const token = RequestContext.getDecodedToken();

    let collection = await this.collectionRepository.findByUser(token.id);
    if (!collection) {
      collection = new Collection({
        user: token.id,
        collects: [alphabet],
        collectCnt: 0,
      });

      await this.collectionRepository.create(collection);
    } else {
      collection.addAlphabet(alphabet);
      await this.collectionRepository.save(collection);
    }

    // const validatedCollection = CollectionZodSchema.parse({
    //   user: token.id,
    //   collects: [alphabet],
    //   collectCnt: 0,
    // });

    // await this.collectionRepository.setCollection(
    //   alphabet,
    //   token.id,
    //   validatedCollection.collectCnt,
    // );

    return alphabet;
  }

  async setCollectionCompleted() {
    const token = RequestContext.getDecodedToken();

    const collection = await this.collectionRepository.findByUser(token.id);
    const myAlphabets = [...collection?.collects];

    if (
      ENTITY.COLLECTION.ENUM_ALPHABET.every((item) =>
        myAlphabets?.includes(item),
      )
    ) {
      ENTITY.COLLECTION.ENUM_ALPHABET.forEach((item) => {
        collection.removeAlphabet(item);
        // const idx = myAlphabets?.indexOf(item);
        // if (idx !== -1) myAlphabets?.splice(idx as number, 1);
      });
      await this.collectionRepository.save(collection);
      // await this.collectionRepository.updateCollection(token.id, myAlphabets);
      await this.Request.create({
        category: '건의',
        title: '알파벳 완성',
        writer: token.id,
        content: `${token.name}/${
          collection?.collectCnt ? collection.collectCnt + 1 : 0
        }`,
      });
    } else {
      throw new InternalServerErrorException('mission not completed');
    }
  }

  async getCollection() {
    const token = RequestContext.getDecodedToken();
    const result = await this.collectionRepository.findByUserJoin(token.id);

    return result === null ? null : result.toPrimitives();
  }

  async getCollectionAll() {
    const result = await this.collectionRepository.findAll();
    return result;
  }
}
