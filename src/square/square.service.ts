import { type Types } from 'mongoose';
import { type JWT } from 'next-auth/jwt/types';
import {
  SecretSquare,
  SecretSquareCategory,
  SecretSquareType,
  SecretSquareZodSchema,
  subCommentType,
} from '../db/models/secretSquare';
import ImageService from './imageService';

interface BaseSecretSquareItem {
  category: SecretSquareCategory;
  title: string;
  content: string;
  type: SecretSquareType;
  poll?: {
    pollItems: { name: string }[];
    canMultiple: boolean;
  };
}

interface BaseSecretSquareItem {
  category: SecretSquareCategory;
  title: string;
  content: string;
}

interface GeneralSecretSquareItem extends BaseSecretSquareItem {
  type: 'general';
}

interface PollSecretSquareItem extends BaseSecretSquareItem {
  type: 'poll';
  poll: {
    pollItems: { name: string }[];
    canMultiple: boolean;
  };
}

type SecretSquareItem = GeneralSecretSquareItem | PollSecretSquareItem;

export default class SquareService {
  private imageServiceInstance: ImageService;
  private token: JWT;

  constructor(token?: JWT) {
    this.token = token as JWT;
    this.imageServiceInstance = new ImageService();
  }

  async getSquareList({
    category,
    cursorNum,
  }: {
    category: SecretSquareCategory | 'all';
    cursorNum: number | null;
  }) {
    const gap = 12;
    let start = gap * (cursorNum || 0);

    return await SecretSquare.find(category === 'all' ? {} : { category }, {
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
    })
      .sort({ createdAt: 'desc' })
      .skip(start)
      .limit(gap);
  }

  async createSquare(square: SecretSquareItem & { buffers: Buffer[] }) {
    const {
      category,
      title,
      content,
      type: squareType,
      poll,
      buffers,
    } = square;

    let images: string[] = [];
    if (buffers.length !== 0) {
      images = await this.imageServiceInstance.uploadImgCom(
        'secret-square',
        buffers,
      );
    }

    const author = this.token.id;

    const validatedSquare =
      squareType === 'poll'
        ? SecretSquareZodSchema.parse({
            category,
            title,
            content,
            author,
            type: squareType,
            poll,
            images,
          })
        : SecretSquareZodSchema.parse({
            category,
            title,
            content,
            author,
            type: squareType,
            images,
          });

    if (squareType === 'poll') {
      const { _id: squareId } = await SecretSquare.create(validatedSquare);
      return { squareId };
    }

    const { _id: squareId } = await SecretSquare.create(validatedSquare);
    return { squareId };
  }

  async deleteSquare(squareId: string) {
    await SecretSquare.findByIdAndDelete(squareId);
  }

  async getSquare(squareId: string) {
    await SecretSquare.findByIdAndUpdate(squareId, {
      $addToSet: { viewers: this.token.id },
    });

    const secretSquare = await SecretSquare.findById(squareId, {
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
      isMySquare: { $eq: ['$author', { $toObjectId: this.token.id }] },
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
    });

    // TODO 404 NOT FOUND
    if (!secretSquare) {
      throw new Error('not found');
    }

    return secretSquare;
  }

  async createSquareComment({
    comment,
    squareId,
  }: {
    comment: string;
    squareId: string;
  }) {
    await SecretSquare.findByIdAndUpdate(squareId, {
      $push: { comments: { user: this.token.id, comment } },
    });
  }

  async deleteSquareComment({
    squareId,
    commentId,
  }: {
    squareId: string;
    commentId: string;
  }) {
    await SecretSquare.findByIdAndUpdate(squareId, {
      $pull: { comments: { _id: commentId } },
    });
  }

  async createSubComment(squareId: string, commentId: string, content: string) {
    try {
      const message: subCommentType = {
        user: this.token.id,
        comment: content,
      };
      await SecretSquare.updateOne(
        {
          _id: squareId,
          'comments._id': commentId,
        },
        { $push: { 'comments.$.subComments': message } },
      );

      return;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async deleteSubComment(
    squareId: string,
    commentId: string,
    subCommentId: string,
  ) {
    try {
      await SecretSquare.updateOne(
        {
          _id: squareId,
          'comments._id': commentId,
        },
        { $pull: { 'comments.$.subComments': { _id: subCommentId } } },
      );
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async updateSubComment(
    squareId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    try {
      await SecretSquare.updateOne(
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
      return;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async createCommentLike(squareId: string, commentId: string) {
    try {
      const feed = await SecretSquare.findOneAndUpdate(
        {
          _id: squareId,
          'comments._id': commentId,
        },
        {
          $addToSet: { 'comments.$.likeList': this.token.id },
        },
        { new: true }, // 업데이트된 도큐먼트를 반환
      );

      if (!feed) {
        throw new Error('해당 feedId 또는 commentId를 찾을 수 없습니다.');
      }
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async createSubCommentLike(
    squareId: string,
    commentId: string,
    subCommentId: string,
  ) {
    try {
      const square = await SecretSquare.findOneAndUpdate(
        {
          _id: squareId,
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

      if (!square) {
        throw new Error('해당 feedId 또는 commentId를 찾을 수 없습니다.');
      }
    } catch (err: any) {
      throw new Error(err);
    }
  }
  async patchPoll({
    squareId,
    pollItems,
  }: {
    squareId: string;
    pollItems: string[];
  }) {
    const secretSquare = await SecretSquare.findById(squareId);

    // TODO 404 NOT FOUND
    if (!secretSquare) {
      throw new Error('not found');
    }

    // HACK Is it correct to write type assertion? Another solution?
    const user = this.token.id as unknown as Types.ObjectId;

    secretSquare.poll.pollItems.forEach((pollItem) => {
      const index = pollItem.users.indexOf(user);
      if (index > -1) {
        pollItem.users.splice(index, 1);
      }
    });

    if (pollItems.length !== 0) {
      pollItems.forEach((pollItemId) => {
        const index = secretSquare.poll.pollItems.findIndex((pollItem) =>
          pollItem._id.equals(pollItemId),
        );
        if (index > -1) {
          secretSquare.poll.pollItems[index].users.push(user);
        }
      });
    }

    await secretSquare.save();
  }

  async getCurrentPollItems({ squareId }: { squareId: string }) {
    const secretSquare = await SecretSquare.findById(squareId);

    // TODO 404 NOT FOUND
    if (!secretSquare) {
      throw new Error('not found');
    }

    if (secretSquare.type === 'general') {
      throw new Error('The type of this square is general');
    }

    // TODO remove type assertion
    const user = this.token.id as unknown as Types.ObjectId;
    const pollItems: string[] = [];

    secretSquare.poll.pollItems.forEach((pollItem) => {
      if (!pollItem.users.includes(user)) return;
      pollItems.push(pollItem._id.toString());
    });

    return pollItems;
  }

  async putLikeSquare({ squareId }: { squareId: string }) {
    const secretSquare = await SecretSquare.findById(squareId);

    if (!secretSquare) {
      throw new Error('not found');
    }

    // TODO remove type assertion
    const user = this.token.id as unknown as Types.ObjectId;

    if (secretSquare.like.includes(user)) {
      throw new Error('already included');
    }

    secretSquare.like.push(user);
    await secretSquare.save();
  }

  async deleteLikeSquare({ squareId }: { squareId: string }) {
    const user = this.token.id;

    await SecretSquare.findByIdAndUpdate(squareId, {
      $pull: { like: user },
    });
  }

  async getIsLike({ squareId }: { squareId: string }) {
    const secretSquare = await SecretSquare.findById(squareId);

    if (!secretSquare) {
      throw new Error('not found');
    }

    // TODO remove type assertion
    const user = this.token.id as unknown as Types.ObjectId;
    const isLike = secretSquare.like.includes(user);

    return isLike;
  }
}