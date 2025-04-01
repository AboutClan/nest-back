import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ALPHABET_COLLECTION } from 'src/Constants/constants';
import { Collection } from 'src/domain/entities/Collection';
import { RequestContext } from 'src/request-context';
import { IRequestData } from 'src/request/request.entity';
import { UserRepository } from 'src/user/user.repository.interface';
import { ICOLLECTION_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { ICollectionRepository } from './CollectionRepository.interface';

@Injectable()
export class CollectionService {
  constructor(
    @InjectModel('Request') private Request: Model<IRequestData>,
    @Inject(IUSER_REPOSITORY)
    private readonly UserRepository: UserRepository,
    @Inject(ICOLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,
  ) {}

  async setCollectionStamp(id: string) {
    const currentCollection = await this.collectionRepository.findByUser(id);
    const currentStamps = currentCollection?.stamps ?? 0;

    if (currentStamps < 5) {
      if (!currentCollection) {
        // 문서가 없으면 새로 생성
        const newCollection = new Collection({ user: id });
        await this.collectionRepository.create(newCollection);
      } else {
        // 문서가 있으면 stamps 증가

        currentCollection.increaseStamp();
        await this.collectionRepository.save(currentCollection);
      }
    }

    const updatedStamps = currentStamps < 4 ? currentStamps + 1 : 0;
    const updatedAlphabet =
      currentStamps === 4
        ? ALPHABET_COLLECTION[Math.floor(Math.random() * 5)]
        : null;

    // stamps가 5인 경우에만 alphabet을 추가합니다
    // stamps가 4인 경우 1 증가 후 5가 되므로 alphabet을 추가
    currentCollection.addAlphabet(updatedAlphabet);
    currentCollection.increaseStamp();
    currentCollection.stamps = 0;
    await this.collectionRepository.save(currentCollection);

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

    myAlphabets.removeAlphabet(mine);
    opponentAlphabets.removeAlphabet(opponent);

    myAlphabets.addAlphabet(opponent);
    opponentAlphabets.addAlphabet(mine);
    // const myCollects = myAlphabets?.collects;
    // const opponentCollects = opponentAlphabets?.collects;
    // const myIdx = myCollects?.indexOf(mine);
    // const opponentIdx = opponentCollects?.indexOf(opponent);
    // myCollects?.splice(myIdx, 1);
    // opponentCollects?.splice(opponentIdx, 1);
    // myCollects?.push(opponent);
    // opponentCollects?.push(mine);
    // await myAlphabets?.save();
    // await opponentAlphabets?.save();

    return null;
  }

  async setCollection(alphabet: string) {
    const token = RequestContext.getDecodedToken();

    let collection = await this.collectionRepository.findByUser(token.id);
    if (!collection) {
      collection = new Collection({
        user: token.id,
        collects: [alphabet],
        collectCnt: 1,
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

    return null;
  }

  async setCollectionCompleted() {
    const token = RequestContext.getDecodedToken();

    const collection = await this.collectionRepository.findByUser(token.id);

    const myAlphabets = [...collection?.collects];

    if (ALPHABET_COLLECTION.every((item) => myAlphabets?.includes(item))) {
      ALPHABET_COLLECTION.forEach((item) => {
        collection.removeAlphabet(item);
        // const idx = myAlphabets?.indexOf(item);
        // if (idx !== -1) myAlphabets?.splice(idx as number, 1);
      });
      await this.collectionRepository.save(collection);
      // await this.collectionRepository.updateCollection(token.id, myAlphabets);
      await this.Request.create({
        category: '건의',
        title: '알파벳 완성',
        writer: token.name,
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
    const result = this.collectionRepository.findByUserJoin(token.id);
    return result;
  }

  async getCollectionAll() {
    const result = await this.collectionRepository.findAll();
    return result;
  }
}
