import { NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { SecretSquareItem } from './square.entity';
import { SquareRepository } from './square.repository.interface';

export class MongoSquareRepository implements SquareRepository {
  constructor(
    @InjectModel(DB_SCHEMA.SQUARE)
    private readonly SecretSquare: Model<SecretSquareItem>,
  ) {}
  async findSquareByCategory(
    category: string,
    start: number,
    gap: number,
  ): Promise<SecretSquareItem[]> {
    // 1) summary projection
    let query = {};

    if (category === 'normalAll') {
      query = { type: { $in: ['info', 'poll2'] } };
    } else if (category === 'secretAll') {
      query = { type: { $in: ['general', 'poll', 'secret'] } };
    } else {
      query = { category };
    }

    const squares = await this.SecretSquare.find(query, {
      category: 1,
      title: 1,
      content: 1,
      type: 1,
      thumbnail: {
        $cond: {
          if: { $eq: [{ $size: '$images' }, 0] },
          then: '',
          else: { $arrayElemAt: ['$images', 0] },
        },
      },
      viewCount: { $size: '$viewers' },
      likeCount: { $size: '$like' },
      commentsCount: { $size: '$comments' },
      createdAt: 1,
      author: 1,
      like: 1,
      comments: 1,
    })
      .sort({ createdAt: 'desc' })
      .skip(start)
      .limit(gap)
      .exec();

    for (const square of squares) {
      if (square.type === 'info' || square.type === 'poll2') {
        await square.populate([
          { path: 'author', select: ENTITY.USER.C_SIMPLE_USER },
          { path: 'like', select: ENTITY.USER.C_SIMPLE_USER },
          { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
        ]);
      }
    }

    return squares;
  }
  async test() {
    await this.SecretSquare.updateMany(
      { type: 'info' },
      {
        $set: { type: '일상' },
      },
    );
  }
  async create(squareData: any): Promise<SecretSquareItem> {
    return await this.SecretSquare.create(squareData);
  }
  async findByIdAndDelete(squareId: string): Promise<null> {
    return await this.SecretSquare.findByIdAndDelete(squareId);
  }
  async findByIdAndUpdate(squareId: string, userId: string): Promise<null> {
    await this.SecretSquare.findByIdAndUpdate(squareId, {
      $addToSet: { viewers: userId },
    });
    return null;
  }
  async findByIdCustom(
    squareId: string,
    userId: any,
  ): Promise<SecretSquareItem> {
    const projection = {
      category: 1,
      title: 1,
      content: 1,
      type: 1,
      author: 1,
      poll: {
        $cond: {
          if: { $eq: ['$type', 'general'] },
          then: null,
          else: {
            pollItems: {
              $map: {
                input: '$poll.pollItems',
                as: 'pollItem',
                in: {
                  _id: '$$pollItem._id',
                  name: '$$pollItem.name',
                  count: { $size: '$$pollItem.users' },
                  users: 0,
                },
              },
            },
            canMultiple: '$poll.canMultiple',
          },
        },
      },
      isMySquare: { $eq: ['$author', { $toObjectId: userId }] },
      images: 1,
      viewCount: { $size: '$viewers' },
      likeCount: { $size: '$like' },
      comments: {
        $map: {
          input: '$comments',
          as: 'comment',
          in: {
            user: '$$comment.user',
            comment: '$$comment.comment',
            createdAt: '$$comment.createdAt',
            updatedAt: '$$comment.updatedAt',
            likeList: '$$comment.likeList',
            _id: '$$comment._id',
            subComments: '$$comment.subComments',
          },
        },
      },
      createdAt: 1,
      updatedAt: 1,
    };

    const square = await this.SecretSquare.findById(
      squareId,
      projection,
    ).exec();

    if (!square) {
      throw new NotFoundException(`SecretSquare with id ${squareId} not found`);
    }
    console.log(3, square);
    if (square.type === 'info' || square.type === 'poll2') {
      await square.populate([
        { path: 'author', select: ENTITY.USER.C_SIMPLE_USER },
        { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
      ]);
    }

    return square;
  }
  async updateComment(
    squareId: string,
    userId: string,
    comment: string,
  ): Promise<SecretSquareItem> {
    const updatedSquare = await this.SecretSquare.findByIdAndUpdate(
      squareId,
      {
        $push: { comments: { user: userId, comment } },
      },
      { new: true }, // 업데이트된 문서 반환
    );

    return updatedSquare;
  }
  async deleteComment(squareId: string, commentId: string): Promise<null> {
    await this.SecretSquare.findByIdAndUpdate(squareId, {
      $pull: { comments: { _id: commentId } },
    });
    return null;
  }
  async createSubComment(
    squareId: string,
    commentId: string,
    message: any,
  ): Promise<SecretSquareItem> {
    const updated = await this.SecretSquare.findOneAndUpdate(
      {
        _id: squareId,
        'comments._id': commentId,
      },
      { $push: { 'comments.$.subComments': message } },
      { new: true },
    );

    return updated;
  }
  async deleteSubComment(
    squareId: string,
    commentId: String,
    subCommentId: string,
  ): Promise<null> {
    await this.SecretSquare.updateOne(
      {
        _id: squareId,
        'comments._id': commentId,
      },
      { $pull: { 'comments.$.subComments': { _id: subCommentId } } },
    );
    return null;
  }
  async updateSubComment(
    squareId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ): Promise<null> {
    await this.SecretSquare.updateOne(
      {
        id: squareId,
        'comments._id': commentId,
        'comments.subComments._id': subCommentId,
      },
      { $set: { 'comments.$[].subComments.$[sub].comment': comment } },
      {
        arrayFilters: [{ 'sub._id': subCommentId }],
      },
    );

    return null;
  }
  async createCommentLike(
    squareId: string,
    commentId: string,
    userId: string,
  ): Promise<SecretSquareItem> {
    return await this.SecretSquare.findOneAndUpdate(
      {
        _id: squareId,
        'comments._id': commentId,
      },
      {
        $addToSet: { 'comments.$.likeList': userId },
      },
      { new: true }, // 업데이트된 도큐먼트를 반환
    );
  }
  async createSubCommentLike(
    squareId: string,
    commentId: string,
    subCommentId: string,
    userId: string,
  ): Promise<SecretSquareItem> {
    return await this.SecretSquare.findOneAndUpdate(
      {
        _id: squareId,
        'comments._id': commentId,
        'comments.subComments._id': subCommentId,
      },
      {
        $addToSet: {
          'comments.$[comment].subComments.$[subComment].likeList': userId,
        },
      },
      {
        arrayFilters: [
          { 'comment._id': commentId },
          { 'subComment._id': subCommentId },
        ],
        new: true,
      },
    );
  }
  async findById(squareId: string): Promise<SecretSquareItem> {
    const square = await this.SecretSquare.findById(squareId);
    if (!square) {
      throw new NotFoundException(`SecretSquare with id ${squareId} not found`);
    }

    if (square.type === 'info' || square.type === 'poll2') {
      await square.populate({
        path: 'author',
        select: ENTITY.USER.C_SIMPLE_USER,
      });
      await square.populate({
        path: 'like',
        select: ENTITY.USER.C_SIMPLE_USER,
      });
      await square.populate({
        path: 'comments.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      });
    }

    return square;
  }

  async updateLike(
    squareId: string,
    userId: string,
  ): Promise<SecretSquareItem> {
    return await this.SecretSquare.findByIdAndUpdate(
      squareId,
      {
        $addToSet: { like: userId },
      },
      { new: true },
    );
  }

  async deleteLikeSquare(squareId: string, userId: string): Promise<null> {
    await this.SecretSquare.findByIdAndUpdate(squareId, {
      $pull: { like: userId },
    });
    return null;
  }
}
