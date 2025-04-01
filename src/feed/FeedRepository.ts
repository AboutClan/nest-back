import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IFeed } from './feed.entity';
import { Feed } from 'src/domain/entities/Feed/Feed';

export class FeedRepository {
  constructor(@InjectModel('Feed') private readonly Feed: Model<IFeed>) {}

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

  private mapToDB(doc: Feed): IFeed {
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
