import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateWriteOpResult } from 'mongoose';
import { IGroupStudyData, subCommentType } from './groupStudy.entity';
import { GroupStudyRepository } from './groupStudy.repository.interface';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
//commit
export class MongoGroupStudyInterface implements GroupStudyRepository {
  constructor(
    @InjectModel(DB_SCHEMA.GROUPSTUDY)
    private readonly GroupStudy: Model<IGroupStudyData>,
  ) {}

  async findWithQueryPopPage(filterQuery: any, start?: number, gap?: number) {
    let query = this.GroupStudy.find(filterQuery || {}).select('-_id');

    if (start !== undefined) {
      query = query.skip(start);
    }
    if (gap !== undefined) {
      query = query.limit(gap);
    }

    return await query
      .populate({
        path: 'organizer',
        select: 'name profileImage uid score avatar comment',
      })
      .populate({
        path: 'participants.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'waiting.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'comments.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'comments.subComments.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      });
  }

  async addParticipantWithAttendance(
    id: string,
    userId: string,
    userName: string,
    userUid: string,
  ): Promise<IGroupStudyData> {
    return await this.GroupStudy.findOneAndUpdate(
      { id },
      {
        $push: {
          participants: { user: userId, role: 'member', attendCnt: 0 },
          'attendance.thisWeek': {
            uid: userUid,
            name: userName,
            attendRecord: [],
          },
          'attendance.lastWeek': {
            uid: userUid,
            name: userName,
            attendRecord: [],
          },
        },
      },
      { new: true },
    );
  }

  async findById(groupStudyId: string): Promise<IGroupStudyData> {
    return await this.GroupStudy.findOne({ id: groupStudyId });
  }

  async findByIdWithWaiting(groupStudyId: string): Promise<IGroupStudyData> {
    return await this.GroupStudy.findOne({ id: groupStudyId })
      .populate(['waiting.user'])
      .select('-_id');
  }

  async findByIdWithPop(groupStudyId: number): Promise<IGroupStudyData> {
    return await this.GroupStudy.findOne({
      id: groupStudyId,
    })
      .populate({
        path: 'organizer',
        select: 'name profileImage uid score avatar comment',
      })
      .populate({
        path: 'participants.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'waiting.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'comments.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      })
      .populate({
        path: 'comments.subComments.user',
        select: 'name profileImage uid score avatar comment location',
      })
      .select('-_id');
  }

  async createSubComment(
    groupStudyId: string,
    commentId: string,
    message: subCommentType,
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
    groupStudyId: number,
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
    groupStudyId: number,
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

  async getUserGroupsTitleByUserId(userId: string): Promise<any> {
    return await this.GroupStudy.find(
      {
        status: 'pending',
        participants: { $elemMatch: { user: userId } }, // userId가 일치하는지 확인
        isSecret: { $ne: true },
      },
      'title category.sub meetingType',
    );
  }
  async getSigningGroupByStatus(userId: string, status: string): Promise<any> {
    return await this.GroupStudy.find({
      status: status === 'pending' ? 'pending' : { $in: ['pending', 'end'] },
      participants: { $elemMatch: { user: userId } }, // userId가 일치하는지 확인
      'category.main': { $ne: '콘텐츠' },
    }).populate({
      path: 'participants.user', // participants 배열 내부의 user 필드를 populate
      select: 'name profileImage uid score avatar comment', // 필요한 필드만 선택
    });
  }

  async weekAttendance(
    groupId: string,
    id: string,
  ): Promise<UpdateWriteOpResult> {
    return await this.GroupStudy.updateOne(
      {
        _id: groupId,
        'participants.user': id,
        'participants.weekAttendance': { $ne: true },
      },
      {
        'participants.$.weekAttendance': true,
        $inc: { 'participants.$.attendCnt': 1 },
      },
    );
  }

  async initWeekAttendance(): Promise<void> {
    await this.GroupStudy.updateMany(
      {},
      {
        'participants.$[].weekAttendance': false,
      },
    );
    return;
  }
  async findEnthMembers() {
    try {
      // Aggregation Pipeline
      const result = await this.GroupStudy.aggregate([
        { $unwind: '$participants' }, // Unwind the participants array
        {
          $group: {
            _id: '$participants.user', // Group by user ID
            count: { $sum: 1 }, // Count occurrences
          },
        },
        {
          $match: {
            count: { $gte: 3 }, // Find users with 3 or more occurrences
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
      console.error(error);
    }
  }

  async findMyGroupStudyId(userId: string) {
    const result = await this.GroupStudy.find({
      participants: {
        $elemMatch: { user: userId },
      },
    }).select('-_id id');

    return result;
  }

  async findMyGroupStudyComment(userId: string) {
    const result = await this.GroupStudy.find({
      participants: {
        $elemMatch: { user: userId },
      },
    }).select('-_id comments');

    return result;
  }

  async test() {
    await this.GroupStudy.updateMany(
      {},
      {
        $set: { comments: [] },
      },
    );
  }
}
