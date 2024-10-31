import { Model } from 'mongoose';
import { IGroupStudyData } from './entity/groupStudy.entity';
import { GroupStudyRepository } from './groupStudy.repository.interface';
import { InjectModel } from '@nestjs/mongoose';
import { C_simpleUser } from 'src/constants';

export class MongoGroupStudyInterface implements GroupStudyRepository {
  constructor(
    @InjectModel('GroupStudy')
    private readonly GroupStudy: Model<IGroupStudyData>,
  ) {}
  async findByStatusAndCategory(
    filterQuery: any,
    start: number,
    gap: number,
  ): Promise<IGroupStudyData[]> {
    return await this.GroupStudy.find(filterQuery)
      .skip(start)
      .limit(gap)
      .populate({
        path: 'organizer',
        select: 'name profileImage uid score avatar comment',
      })
      .populate({
        path: 'participants.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'waiting.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'comments.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      })
      .select('-_id');
  }
  async findByCategory(category: string): Promise<IGroupStudyData[]> {
    return await this.GroupStudy.find({
      'category.main': category,
    })
      .populate({
        path: 'organizer',
        select: 'name profileImage uid score avatar comment',
      })
      .populate({
        path: 'participants.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'waiting.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'comments.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      })
      .select('-_id');
  }
  async findById(groupStudyId: unknown): Promise<IGroupStudyData> {
    return await this.GroupStudy.findOne({
      id: groupStudyId,
    })
      .populate({
        path: 'organizer',
        select: 'name profileImage uid score avatar comment',
      })
      .populate({
        path: 'participants.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'waiting.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'comments.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'comments.subComments.user',
        select: 'name profileImage uid score avatar comment location',
      })
      .select('-_id');
  }
  async findByParticipant(userId: string): Promise<IGroupStudyData[]> {
    return await this.GroupStudy.find({
      'participants.user': userId as string,
    })
      .populate({
        path: 'organizer',
        select: 'name profileImage uid score avatar comment',
      })
      .populate({
        path: 'participants.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'waiting.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'comments.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'comments.user',
        select: C_simpleUser,
      })
      .select('-_id');
  }
  async findAllFilter(start: number, gap: number): Promise<IGroupStudyData[]> {
    return await this.GroupStudy.find()
      .skip(start)
      .limit(gap + 1)
      .populate({
        path: 'organizer',
        select: 'name profileImage uid score avatar comment',
      })
      .populate({
        path: 'participants.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'waiting.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'comments.user',
        select: C_simpleUser,
      })
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      })
      .select('-_id');
  }
  async createSubComment(
    groupStudyId: string,
    commentId: string,
    message: string,
  ): Promise<null> {
    await this.GroupStudy.updateOne(
      {
        id: groupStudyId,
        'comments._id': commentId,
      },
      { $push: { 'comments.$.subComments': message } },
    );
    return null;
  }
  async deleteSubComment(
    groupStudyId: string,
    commentId: string,
    subCommentId: string,
  ): Promise<null> {
    const updated = await this.GroupStudy.updateOne(
      {
        id: groupStudyId,
        'comments._id': commentId,
      },
      { $pull: { 'comments.$.subComments': { _id: subCommentId } } },
    );
    return null;
  }
  async updateSubComment(
    groupStudyId: string,
    commentId: string,
    subCommentId: string,
    message: string,
  ): Promise<null> {
    await this.GroupStudy.updateOne(
      {
        id: groupStudyId,
        'comments._id': commentId,
        'comments.subComments._id': subCommentId,
      },
      { $set: { 'comments.$[].subComments.$[sub].comment': message } },
      {
        arrayFilters: [{ 'sub._id': subCommentId }],
      },
    );
    return null;
  }
  async createGroupStudy(
    groupStudyData: Partial<IGroupStudyData>,
  ): Promise<IGroupStudyData> {
    return await this.GroupStudy.create(groupStudyData);
  }
  async createCommentLike(
    groupStudyId: string,
    commentId: string,
    userId: string,
  ): Promise<IGroupStudyData> {
    return await this.GroupStudy.findOneAndUpdate(
      {
        id: groupStudyId,
        'comments._id': commentId,
      },
      {
        $addToSet: { 'comments.$.likeList': userId },
      },
      { new: true }, // 업데이트된 도큐먼트를 반환
    );
  }
  async createSubCommentLike(
    groupStudyId: string,
    commentId: string,
    subCommentId: string,
    userId: string,
  ): Promise<IGroupStudyData> {
    return await this.GroupStudy.findOneAndUpdate(
      {
        id: groupStudyId,
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
  }
  async findAll(): Promise<IGroupStudyData[]> {
    return await this.GroupStudy.find({});
  }
}