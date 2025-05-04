import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder } from 'mongoose';
import { C_simpleUser } from 'src/Constants/constants';
import { IGatherData, participantsType, subCommentType } from './gather.entity';
import { GatherRepository } from './gather.repository.interface';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

export class MongoGatherRepository implements GatherRepository {
  constructor(
    @InjectModel(DB_SCHEMA.GATHER)
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

      return result;
    } catch (error) {
      console.error('Error:', error);
    }
  }
  async findById(gatherId: number, pop?: boolean): Promise<IGatherData> {
    let query = this.Gather.findOne({ id: gatherId });

    if (pop) {
      query = query
        .populate([
          'user',
          'participants.user',
          'waiting.user',
          'comments.user',
        ])
        .populate({
          path: 'comments.subComments.user',
          select: C_simpleUser,
        });
    }
    return await query;
  }

  async findThree(): Promise<IGatherData[]> {
    const gatherData = await this.Gather.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate(['user', 'participants.user', 'waiting.user', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      });

    return gatherData;
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
    return await this.Gather.findOneAndUpdate(
      { id: gatherId },
      {
        $pull: { participants: { user: userId } },
      },
      { useFindAndModify: false },
    );
    return null;
  }
  async createSubComment(
    gatherId: string,
    commentId: string,
    message: subCommentType,
  ): Promise<IGatherData> {
    return await this.Gather.findOneAndUpdate(
      {
        id: gatherId,
        'comments._id': commentId,
      },
      { $push: { 'comments.$.subComments': message } },
      { new: true },
    );
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
    return await this.Gather.findOneAndUpdate(
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
      { id: gatherId, 'comments._id': commentId },
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

  async participate(gatherId: number, participateData: participantsType) {
    await this.Gather.updateOne(
      {
        id: gatherId,
        'participants.user': { $ne: participateData.user },
      },
      {
        $push: {
          participants: participateData,
        },
      },
    );
  }

  async findWithQueryPop(
    query: any,
    start?: number,
    gap?: number,
    sortBy: 'createdAt' | 'date' = 'createdAt',
  ) {
    const sortOption: { [key: string]: SortOrder } = { [sortBy]: -1 };
    const result = await this.Gather.find(query)
      .sort(sortOption)
      .skip(start)
      .limit(gap)
      .select('-_id')
      .populate(['user', 'participants.user', 'waiting.user', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      });

    return result;
  }

  async findMyGatherId(userId: string) {
    const result = await this.Gather.find({
      participants: {
        $elemMatch: { user: userId },
      },
    }).select('-_id id');

    return result;
  }

  async exileUser(gatherId: number, userId: string) {
    await this.Gather.updateOne(
      { id: gatherId }, // 숫자 타입 ID 검색
      { $pull: { participants: { user: userId } } }, // $elemMatch 없이 바로 사용
    );
  }
}
