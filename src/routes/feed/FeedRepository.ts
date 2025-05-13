import { HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { Feed } from 'src/domain/entities/Feed/Feed';
import { IFeed } from './feed.entity';
import { IFeedRepository } from './FeedRepository.interface';

export class FeedRepository implements IFeedRepository {
  constructor(
    @InjectModel(DB_SCHEMA.FEED) private readonly FeedModel: Model<IFeed>,
  ) {}

  async create(doc: Feed): Promise<Feed> {
    const docToCreate = this.mapToDB(doc);
    const created = await this.FeedModel.create(docToCreate);
    return this.mapToDomain(created);
  }
  async save(doc: Feed): Promise<Feed> {
    const docToSave = this.mapToDB(doc);
    const updatedDoc = await this.FeedModel.findByIdAndUpdate(
      docToSave.id,
      docToSave,
      { new: true },
    );

    if (!updatedDoc) {
      throw new HttpException(`Chat not found for id=${docToSave._id}`, 500);
    }

    return this.mapToDomain(updatedDoc);
  }

  async findAll(opt: any): Promise<Feed[]> {
    let query = this.FeedModel.find().populate([
      { path: 'like', select: ENTITY.USER.C_SIMPLE_USER },
      { path: 'writer', select: ENTITY.USER.C_SIMPLE_USER },
      { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
      { path: 'comments.subComments.user', select: ENTITY.USER.C_SIMPLE_USER },
    ]);

    if (opt.start) query = query.skip(opt.start);
    if (opt.gap) query = query.limit(opt.gap);
    if (opt.isRecent)
      query = query.sort({ createdAt: opt.isRecent === 'true' ? -1 : 1 });

    const docs = await query;
    return docs.map((doc) => this.mapToDomain(doc));
  }

  async findById(id: string): Promise<Feed> {
    const doc = await (
      await this.FeedModel.findOne({ typeId: id })
    ).populate([
      { path: 'like', select: ENTITY.USER.C_SIMPLE_USER },
      { path: 'writer', select: ENTITY.USER.C_SIMPLE_USER },
      { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
      { path: 'comments.subComments.user', select: ENTITY.USER.C_SIMPLE_USER },
    ]);
    return this.mapToDomain(doc);
  }

  async findByIdJoin(id: string): Promise<Feed> {
    const doc = await this.FeedModel.findOne({ typeId: id }).populate({
      path: 'like',
      select: 'avatar name profileImage uid _id', // 필요한 필드만 선택
    });
    return this.mapToDomain(doc);
  }

  async findByType(type: string, opt: any): Promise<Feed[]> {
    let query = this.FeedModel.find({ type });

    if (opt.start) query = query.skip(opt.start);
    if (opt.gap) query = query.limit(opt.gap);
    if (opt.sort) query = query.sort({ createdAt: opt.sort });
   
    const docs = await query
      .populate(['writer', 'like', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      });

    return docs.map((doc) => this.mapToDomain(doc));
  }

  async findMyFeed(feedType: string, userId: string): Promise<Feed[]> {
    const docs = await this.FeedModel.find({
      type: feedType,
      writer: userId,
    }).sort({
      createdAt: -1,
    });

    return docs.map((doc) => this.mapToDomain(doc));
  }

  async findRecievedFeed(feedType: string, idArr: string[]) {
    const docs = await this.FeedModel.find({
      $and: [{ type: feedType }, { typeId: { $in: idArr } }],
    });
    return docs.map((doc) => this.mapToDomain(doc));
  }

  private mapToDomain(doc: IFeed): Feed {
    return new Feed({
      id: doc._id as string,
      title: doc.title,
      text: doc.text,
      images: doc.images,
      writer: doc.writer as string,
      type: doc.type,
      typeId: doc.typeId,
      isAnonymous: doc.isAnonymous,
      like: doc.like as string[],
      comments: (doc.comments ?? []).map((c) => ({
        id: c.id,
        user: c.user as string,
        likeList: c.likeList,
        comment: c.comment,
        subComments: (c.subComments ?? []).map((sub) => ({
          id: sub.id as string,
          user: sub.user as string,
          likeList: sub.likeList,
          comment: sub.comment,
        })),
      })),
      subCategory: doc.subCategory,
      createdAt: doc.createdAt,
    });
  }

  private mapToDB(doc: Feed): Partial<IFeed> {
    const feedProps = doc.toPrimitives();

    return {
      id: feedProps.id,
      title: feedProps.title,
      text: feedProps.text,
      images: feedProps.images,
      writer: feedProps.writer as string,
      type: feedProps.type,
      typeId: feedProps.typeId,
      isAnonymous: feedProps.isAnonymous,
      like: feedProps.like as string[],
      comments: (feedProps.comments ?? []).map((c) => ({
        id: c.id as string,
        user: c.user as string,
        likeList: c.likeList,
        comment: c.comment,
        subComments: (c.subComments ?? []).map((sub) => ({
          user: sub.user as string,
          likeList: sub.likeList,
          comment: sub.comment,
        })),
      })),
      subCategory: feedProps.subCategory,
      createdAt: feedProps.createdAt,
      addLike: null,
    };
  }
}
