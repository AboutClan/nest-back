import { HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { C_simpleUser } from 'src/Constants/constants';
import { Feed } from 'src/domain/entities/Feed/Feed';
import { IFeed } from './feed.entity';
import { IFeedRepository } from './FeedRepository.interface';

export class FeedRepository implements IFeedRepository {
  constructor(@InjectModel('Feed') private readonly FeedModel: Model<IFeed>) {}

  async create(doc: Feed): Promise<Feed> {
    const docToCreate = this.mapToDB(doc);
    const created = await this.FeedModel.create(docToCreate);
    return this.mapToDomain(created);
  }
  async save(doc: Feed): Promise<Feed> {
    const docToSave = this.mapToDB(doc);
    const updatedDoc = await this.FeedModel.findByIdAndUpdate(
      docToSave._id,
      docToSave,
      { new: true },
    );

    if (!updatedDoc) {
      throw new HttpException(`Chat not found for id=${docToSave._id}`, 500);
    }

    return this.mapToDomain(updatedDoc);
  }

  async findAll(opt: any): Promise<Feed[]> {
    let query = this.FeedModel.find();

    if (opt.start) query = query.skip(opt.start);
    if (opt.limit) query = query.skip(opt.limit);
    if (opt.isRecent) query = query.sort({ createdAt: opt.isRecent ? -1 : 1 });

    const docs = await query;
    return docs.map((doc) => this.mapToDomain(doc));
  }

  async findById(id: string): Promise<Feed> {
    const doc = await this.FeedModel.findById(id);
    return this.mapToDomain(doc);
  }

  async findByIdJoin(id: string): Promise<Feed> {
    const doc = await this.FeedModel.findById(id).populate({
      path: 'like',
      select: 'avatar name profileImage uid _id', // 필요한 필드만 선택
    });
    return this.mapToDomain(doc);
  }

  async findByType(type: string, opt: any): Promise<Feed[]> {
    let query = this.FeedModel.find({ type });

    if (opt.start) query = query.skip(opt.start);
    if (opt.limit) query = query.limit(opt.limit);
    if (opt.sort) query = query.sort({ createdAt: opt.sort });

    const docs = await query
      .populate(['writer', 'like', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      });

    return docs.map((doc) => this.mapToDomain(doc));
  }

  private mapToDomain(doc: IFeed): Feed {
    const feed = new Feed({
      title: doc.title,
      text: doc.text,
      images: doc.images,
      writer: doc.writer as string,
      type: doc.type,
      typeId: doc.typeId,
      isAnonymous: doc.isAnonymous,
      like: doc.like as string[],
      comments: (doc.comments ?? []).map((c) => ({
        user: c.user as string,
        likeList: c.likeList,
        comment: c.comment,
        subComments: (c.subComments ?? []).map((sub) => ({
          user: sub.user as string,
          likeList: sub.likeList,
          comment: sub.comment,
        })),
      })),
      subCategory: doc.subCategory,
      createdAt: doc.createdAt,
    });
    return feed;
  }

  private mapToDB(doc: Feed): Partial<IFeed> {
    const feedProps = doc.toPrimitives();

    return {
      title: feedProps.title,
      text: feedProps.text,
      images: feedProps.images,
      writer: feedProps.writer as string,
      type: feedProps.type,
      typeId: feedProps.typeId,
      isAnonymous: feedProps.isAnonymous,
      like: feedProps.like as string[],
      comments: (feedProps.comments ?? []).map((c) => ({
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
