import { InjectModel } from '@nestjs/mongoose';
import { GatherRepository } from './gather.repository.interface';
import { Model } from 'mongoose';
import { IGatherData, subCommentType } from './entity/gather.entity';
import { C_simpleUser } from 'src/constants';

export class MongoGatherRepository implements GatherRepository {
  constructor(
    @InjectModel('Gather')
    private readonly Gather: Model<IGatherData>,
  ) {}
  async findById(gatherId: string): Promise<IGatherData> {
    return await this.Gather.findOne({ id: gatherId });
  }
  async findByIdPop(gatherId: number): Promise<IGatherData> {
    return await this.Gather.findOne({ id: gatherId })
      .populate(['user', 'participants.user', 'waiting.user', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      });
  }
  async findThree(): Promise<IGatherData[]> {
    return await this.Gather.find()
      .populate(['user', 'participants.user', 'waiting.user', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      })
      .sort({ id: -1 })
      .limit(3);
  }
  async findAll(start: number, gap: number): Promise<IGatherData[]> {
    return await this.Gather.find()
      .sort({ id: -1 })
      .skip(start)
      .limit(gap)
      .select('-_id')
      .populate([
        { path: 'user' },
        { path: 'participants.user' },
        { path: 'comments.user' },
        { path: 'waiting.user' },
        {
          path: 'comments.subComments.user',
          select: C_simpleUser,
        },
      ]);
  }
  async createGather(gatherData: Partial<IGatherData>): Promise<IGatherData> {

    return await this.Gather.create(gatherData);
  }
  async updateGather(
    gatherId: number,
    gatherData: Partial<IGatherData>,
  ): Promise<null> {
    await this.Gather.updateOne({ id: gatherId }, gatherData);
    return null;
  }
  async deleteParticipants(gatherId: string, userId: string): Promise<null> {
    await this.Gather.findOneAndUpdate(
      { id: gatherId },
      {
        $pull: { participants: { user: userId } },
      },
      { new: true, useFindAndModify: false },
    );
    return null;
  }
  async createSubComment(
    gatherId: string,
    commentId: string,
    message: subCommentType,
  ): Promise<null> {
    await this.Gather.updateOne(
      {
        id: gatherId,
        'comments._id': commentId,
      },
      { $push: { 'comments.$.subComments': message } },
    );
    return null;
  }
  async deleteSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<null> {
    await this.Gather.updateOne(
      {
        id: gatherId,
        'comments._id': commentId,
      },
      { $pull: { 'comments.$.subComments': { _id: subCommentId } } },
    );
    return null;
  }
  async updateSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ): Promise<null> {
    await this.Gather.updateOne(
      {
        id: gatherId,
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
  async createComment(
    gatherId: string,
    userId: string,
    message: string,
  ): Promise<null> {
    await this.Gather.findByIdAndUpdate(
      gatherId,
      {
        $push: {
          comments: {
            user: userId,
            comment: message,
          },
        },
      },
      { new: true }, // 업데이트 후 변경된 문서를 반환 (선택 사항)
    );
    return null;
  }
  async deleteComment(gatherId: string, commentId: string): Promise<null> {
    await this.Gather.findOneAndUpdate(
      { _id: gatherId },
      { $pull: { comments: { _id: commentId } } },
    );
    return null;
  }
  async updateComment(
    gatherId: string,
    commentId: string,
    comment: string,
  ): Promise<null> {
    await this.Gather.updateOne(
      { _id: gatherId, 'comments._id': commentId },
      { $set: { 'comments.$.comment': comment } },
    );

    return null;
  }
  async createCommentLike(
    gatherId: number,
    commentId: string,
    userId: string,
  ): Promise<IGatherData> {
    return await this.Gather.findOneAndUpdate(
      {
        id: gatherId,
        'comments._id': commentId,
      },
      {
        $addToSet: { 'comments.$.likeList': userId },
      },
      { new: true }, // 업데이트된 도큐먼트를 반환
    );
  }
  async createSubCommentLike(
    gatherId: string,
    commentId: string,
    subCommentId: string,
    userId: string,
  ): Promise<null> {
    await this.Gather.findOneAndUpdate(
      {
        id: gatherId,
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
        new: true, // 업데이트된 도큐먼트를 반환
      },
    );

    return null;
  }
  async deleteById(gatherId: string): Promise<any> {
    return await this.Gather.deleteOne({ id: gatherId });
  }
}
