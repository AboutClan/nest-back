import { Model, Types } from 'mongoose';
import { JWT } from 'next-auth/jwt';
import { Inject, Injectable } from '@nestjs/common';
import ImageService from 'src/imagez/image.service';
import {
  commentType,
  FeedZodSchema,
  IFeed,
  subCommentType,
} from './entity/feed.entity';
import { C_simpleUser } from 'src/constants';
import { IUser } from 'src/user/entity/user.entity';
import { ValidationError } from 'src/errors/ValidationError';
import { DatabaseError } from 'src/errors/DatabaseError';
import { InjectModel } from '@nestjs/mongoose';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class FeedService {
  private token: JWT;
  private imageServiceInstance: ImageService;

  constructor(
    @InjectModel('Feed') private Feed: Model<IFeed>,
    @InjectModel('User') private User: Model<IUser>,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
    this.imageServiceInstance = new ImageService();
  }

  async findFeedByType(
    type?: string,
    typeId?: string,
    cursor?: number | null,
    isRecent?: boolean,
  ) {
    const gap = 12;
    let start = gap * (cursor || 0);

    const query: any = { type };
    if (typeId && typeId.trim() !== '') {
      query.typeId = typeId;
    }

    const feeds = await this.Feed.find(query)
      .populate(['writer', 'like', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      })
      .sort({ createdAt: isRecent ? -1 : 1 })
      .skip(start)
      .limit(gap);

    if (isRecent === false) {
      feeds.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    }

    return feeds?.map((feed) => {
      const myLike = (feed?.like as IUser[])?.find(
        (who) => who.uid === this.token.uid,
      );
      let modifiedLike;
      if (myLike) {
        modifiedLike = [
          myLike,
          ...(feed.like as IUser[])
            .filter((who) => who.uid !== myLike.uid)
            .slice(0, 7),
        ];
      } else {
        modifiedLike = feed.like.slice(0, 8);
      }
      return {
        ...feed.toObject(),
        like: modifiedLike,
        likeCnt: feed?.like?.length,
      };
    });
  }

  async findFeedById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('invalid mongoDB Id type');
    }

    const feed = await this.Feed.findById(id)
      .populate(['writer', 'like', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      });
    const myLike = (feed?.like as IUser[])?.find(
      (who) => who.uid === this.token.uid,
    );
    let modifiedLike;
    if (myLike) {
      modifiedLike = [
        myLike,
        ...(feed?.like as IUser[])
          .filter((who) => who.uid !== myLike.uid)
          .slice(0, 7),
      ];
    } else {
      modifiedLike = feed?.like.slice(0, 8);
    }
    return {
      ...feed?.toObject(),
      like: modifiedLike,
      likeCnt: feed?.like?.length,
    };
  }

  async findFeedLikeById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('invalid mongoDB Id type');
    }
    const feed = await this.Feed.findById(id).populate({
      path: 'like',
      select: 'avatar name profileImage uid _id', // 필요한 필드만 선택
    });

    return feed?.like as IUser[];
  }

  async findAllFeeds(cursor: number | null, isRecent?: boolean) {
    const gap = 12;
    let start = gap * (cursor || 0);

    const feeds = await this.Feed.find()
      .populate(['writer', 'like', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      })
      .sort({ createdAt: isRecent ? -1 : 1 })
      .skip(start)
      .limit(gap);

    return feeds?.map((feed) => {
      const myLike = (feed?.like as IUser[])?.find(
        (who) => who.uid === this.token.uid,
      );
      let modifiedLike;
      if (myLike) {
        modifiedLike = [
          myLike,
          ...(feed.like as IUser[])
            .filter((who) => who.uid !== myLike.uid)
            .slice(0, 7),
        ];
      } else {
        modifiedLike = feed.like.slice(0, 8);
      }
      return {
        ...feed.toObject(),
        like: modifiedLike,
        likeCnt: feed?.like?.length,
      };
    });
  }

  async createFeed({
    title,
    text,
    type,
    buffers,
    typeId,
    isAnonymous,
    subCategory,
  }: any) {
    const images = await this.imageServiceInstance.uploadImgCom(
      'feed',
      buffers,
    );
    const validatedFeed = FeedZodSchema.parse({
      title,
      text,
      writer: this.token.id,
      type,
      typeId,
      images,
      isAnonymous: Boolean(isAnonymous),
      subCategory,
    });

    await this.Feed.create(validatedFeed);
    return;
  }
  async createComment(feedId: string, content: string) {
    const message: commentType = {
      user: this.token.id,
      comment: content,
    };

    //transaction
    const feed = await this.Feed.findByIdAndUpdate(
      feedId,
      { $push: { comments: message } },
      { new: true, useFindAndModify: false },
    );

    if (!feed) throw new DatabaseError('reate comment failed');

    const user = await this.User.findOneAndUpdate(
      { uid: this.token.uid },
      { $inc: { point: 2 } },
      { new: true, useFindAndModify: false },
    );
    if (!user) throw new DatabaseError('update score failed');

    return;
  }

  async deleteComment(feedId: string, commentId: string) {
    const feed = await this.Feed.findByIdAndUpdate(
      feedId,
      { $pull: { comments: { _id: commentId } } },
      { new: true, useFindAndModify: false },
    );

    if (!feed) throw new DatabaseError('delete comment failed');

    return;
  }

  async updateComment(feedId: string, commentId: string, comment: string) {
    const result = await this.Feed.findOneAndUpdate(
      { _id: feedId, 'comments._id': commentId },
      {
        $set: {
          'comments.$.comment': comment,
        },
      },
    );

    if (!result) throw new DatabaseError('update comment failed');

    return result;
  }

  async createCommentLike(feedId: string, commentId: string) {
    const feed = await this.Feed.findOneAndUpdate(
      {
        _id: feedId,
        'comments._id': commentId,
      },
      {
        $addToSet: { 'comments.$.likeList': this.token.id },
      },
      { new: true }, // 업데이트된 도큐먼트를 반환
    );

    if (!feed) {
      throw new DatabaseError('create comment like failed');
    }
    return;
  }

  async createSubCommentLike(
    feedId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const feed = await this.Feed.findOneAndUpdate(
      {
        _id: feedId,
        'comments._id': commentId,
        'comments.subComments._id': subCommentId,
      },
      {
        $addToSet: {
          'comments.$[comment].subComments.$[subComment].likeList':
            this.token.id,
        },
      },
      {
        arrayFilters: [
          { 'comment._id': commentId },
          { 'subComment._id': subCommentId },
        ],
        new: true, // 업데이트된 도큐먼트를 반환
      },
    );

    if (!feed) {
      throw new DatabaseError('create subcomment like failed');
    }
  }

  async createSubComment(feedId: string, commentId: string, content: string) {
    const message: subCommentType = {
      user: this.token.id,
      comment: content,
    };

    const updated = await this.Feed.updateOne(
      {
        _id: feedId,
        'comments._id': commentId,
      },
      { $push: { 'comments.$.subComments': message } },
    );

    if (!updated.modifiedCount) throw new DatabaseError('nothing updated');

    return;
  }

  async deleteSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const updated = await this.Feed.updateOne(
      {
        _id: feedId,
        'comments._id': commentId,
      },
      { $pull: { 'comments.$.subComments': { _id: subCommentId } } },
    );

    if (!updated.modifiedCount) throw new DatabaseError('nothing updated');
  }

  async updateSubComment(
    feedId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    const updated = await this.Feed.updateOne(
      {
        _id: feedId,
        'comments._id': commentId,
        'comments.subComments._id': subCommentId,
      },
      { $set: { 'comments.$[].subComments.$[sub].comment': comment } },
      {
        arrayFilters: [{ 'sub._id': subCommentId }],
      },
    );

    if (!updated.modifiedCount) throw new DatabaseError('nothing updated');
    return;
  }

  async toggleLike(feedId: string) {
    const feed = await this.Feed.findById(feedId);

    const isLikePush: boolean = await feed?.addLike(this.token.id);

    const user = await this.User.findOne({ uid: this.token.uid });
    if (!user) return;
    if (isLikePush) user.point += 2;
    else user.point -= 1;
    await user.save();
    return;
  }
}
