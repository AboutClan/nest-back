import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { C_simpleUser } from 'src/Constants/constants';
import { IGatherData, subCommentType } from './gather.entity';
import { GatherRepository } from './gather.repository.interface';

export class MongoGatherRepository implements GatherRepository {
  constructor(
    @InjectModel('Gather')
    private readonly Gather: Model<IGatherData>,
  ) {}
  async getEnthMembers() {
    try {
      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      ).toISOString();
      const endOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
      ).toISOString();

      const result = await this.Gather.aggregate([
        {
          $match: {
            date: {
              $gte: startOfMonth,
              $lte: endOfMonth,
            },
          },
        },
        { $unwind: '$participants' },
        {
          $group: {
            _id: '$participants.user',
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $gte: 3 },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        {
          $unwind: '$userDetails', // userDetails 배열을 펼침
        },
        {
          $project: {
            _id: 1,
            count: 1,
            uid: '$userDetails.uid', // userDetails.uid를 바로 꺼냄
            name: '$userDetails.name', // userDetails.name을 바로 꺼냄
          },
        },
      ]);

      console.log('Users with 3 or more participations this month:', result);
      return result;
    } catch (error) {
      console.error('Error:', error);
    }
  }
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
      .sort({ createdAt: -1 })
      .limit(6);
  }
  async findAll(start: number, gap: number): Promise<IGatherData[]> {
    return await this.Gather.find()
      .sort({ createdAt: -1 })
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
  async deleteParticipants(gatherId: number, userId: string): Promise<null> {
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
    await this.Gather.findOneAndUpdate(
      { id: gatherId },
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
      { id: gatherId },
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

  async deleteWaiting(gatherId: string, userId: string) {
    await this.Gather.findOneAndUpdate(
      { id: gatherId },
      { $pull: { waiting: { user: userId } } },
      { new: true },
    );
  }

  async updateNotOpened(current: Date) {
    await this.Gather.updateMany(
      {
        $and: [
          { status: { $eq: 'pending' } },
          { date: { $lt: current.toISOString() } },
        ],
      },
      [
        {
          $set: {
            status: {
              $cond: {
                if: {
                  $lt: [
                    { $add: [{ $size: '$participants' }, 1] },
                    '$memberCnt.min',
                  ],
                },
                then: 'close',
                else: 'open',
              },
            },
          },
        },
      ],
    );
  }

  async participate(gatherId: number, userId: string, phase: string) {
    await this.Gather.updateOne(
      {
        id: gatherId,
        'participants.user': { $ne: userId },
      },
      {
        $push: {
          participants: {
            user: userId,
            phase,
          },
        },
      },
    );
  }

  async findMyStatusGather(
    userId: string,
    status: string,
    start: number,
    gap: number,
  ) {
    const result = await this.Gather.find({
      $and: [
        {
          participants: {
            $elemMatch: { user: userId },
          },
        },
        status == 'open' ? { status: 'open' } : { status: { $ne: 'open' } },
      ],
    })
      .skip(start)
      .limit(gap)
      .select('-_id');

    return result;
  }

  async findMyGather(userId: string, start: number, gap: number) {
    const result = await this.Gather.find({
      user: userId,
    })
      .skip(start)
      .limit(gap)
      .select('-_id');

    return result;
  }
}
