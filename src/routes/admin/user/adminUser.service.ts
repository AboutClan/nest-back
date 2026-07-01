import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { DatabaseError } from 'src/errors/DatabaseError';
import { logger } from 'src/logger';
import GroupStudyService from 'src/MSA/GroupStudy/core/services/groupStudy.service';
import { IGroupStudyData } from 'src/MSA/GroupStudy/entity/groupStudy.entity';
import { UserService } from 'src/MSA/User/core/services/user.service';
import { IUser } from 'src/MSA/User/entity/user.entity';
import { ILog } from 'src/routes/logz/log.entity';
import { UserFilterType } from './adminUser.controller';

type UserQueryProps = {
  isActive?: true;
  location?: string;
  score?: { $gt: number };
  monthScore?: { $gt: number };
  weekStudyAccumulationMinutes?: { $gt: number };
  'temperature.temperature'?: { $gt: number };
};
export default class AdminUserService {
  constructor(
    @InjectModel(DB_SCHEMA.USER) private User: Model<IUser>,
    @InjectModel(DB_SCHEMA.GROUPSTUDY)
    private GroupStudy: Model<IGroupStudyData>,
    @InjectModel(DB_SCHEMA.LOG) private Log: Model<ILog>,
    private readonly userService: UserService,
    private readonly groupStudyService: GroupStudyService,
  ) {}

  async getAllUser(type?: UserFilterType) {
    const query: any = {
      isActive: true,
      gender: { $exists: true, $ne: '' },
    };

    if (type === 'study') {
      (query as any).$or = [
        { 'studyRecord.accumulationCnt': { $gt: 0 } },
        { 'studyRecord.accumulationMinutes': { $gt: 0 } },
      ];
    } else if (type === 'monthScore') {
      query.monthScore = { $gt: 0 };
    } else if (type === 'temperature') {
      query['temperature.cnt'] = { $gt: 1 };
    }

    const filterArr = ['3224546232'];

    const addField =
      type === 'study'
        ? 'studyRecord'
        : type === 'monthScore'
          ? 'monthScore rank'
          : 'locationDetail isPrivate';

    if (type === 'temperature') {
      const res = await this.User.find(
        query,
        ENTITY.USER.C_SIMPLE_USER + addField,
      )
        .sort({ 'temperature.temperature': -1, 'temperature.cnt': -1 })
        .limit(502); // 내림차순 정렬

      return res.filter((who) => !filterArr.includes(who.uid));
    } else {
      const res = await this.User.find(
        query,
        ENTITY.USER.C_SIMPLE_USER + addField,
      );

      return res.filter((who) => !filterArr.includes(who.uid));
    }
  }

  async updateProfile(profile: Partial<IUser>) {
    const result = await this.User.updateOne({ uid: profile.uid }, profile);
    if (!result.modifiedCount) throw new DatabaseError('update failed');
    return;
  }

  async updateValue(
    uid: string,
    value: string,
    type: 'point' | 'score' | 'deposit',
    message: string,
  ) {
    const user = await this.User.findOne({ uid });
    if (!user) throw new Error();

    try {
      switch (type) {
        case 'point':
          user.point += parseInt(value);
          break;
        case 'score':
          user.score += parseInt(value);
          break;
        case 'deposit':
          user.deposit += parseInt(value);
          break;
      }

      await user.save();
    } catch (err) {
      throw new Error();
    }

    logger.logger.info(message, {
      type,
      uid,
      value,
    });
    return;
  }

  async deleteScore() {
    await this.User.updateMany({}, { $set: { score: 0 } });
    return;
  }

  async deletePoint() {
    await this.User.updateMany({}, { $set: { point: 0 } });
    return;
  }

  async getCertainUser(uid: string) {
    const user = await this.User.findOne({ uid: uid });
    return user;
  }

  async setRole(role: string, uid: string) {
    const result = await this.User.updateOne(
      { status: 'active', uid: uid },
      {
        $set: {
          role: role,
        },
      },
    );
    if (!result.modifiedCount) throw new DatabaseError('update failed');
    return;
  }

  async updateBelong(uid: string, belong: string) {
    await this.User.updateMany({ uid }, { $set: { belong } });
    return;
  }

  async runMonthlyTicketAndAttend() {
    await this.userService.processTicket();
    await this.groupStudyService.processGroupStudyAttend();
    return { success: true };
  }

  async rollbackGroupStudyTicketPoints() {
    const logs = await this.Log.find({
      message: '월간 소모임 참여권 오류 복구',
    }).lean();

    if (!logs.length) return { rolledBack: 0, details: [] };

    const details: { uid: string; deducted: number }[] = [];

    for (const log of logs) {
      const uid = String(log.meta?.uid);
      const value = log.meta?.value as number;
      if (!uid || !value || value <= 0) continue;

      await this.User.findOneAndUpdate({ uid }, { $inc: { point: -value } });

      details.push({ uid, deducted: value });
    }

    await this.Log.deleteMany({ message: '월간 소모임 참여권 오류 복구' });

    return { rolledBack: details.length, details };
  }

  async recoverGroupStudyTicketPoints() {
    const logs = await this.Log.find({
      message: '월간 소모임 참여권 정산 (포인트 대체)',
    }).lean();

    if (!logs.length) return { recovered: 0, details: [] };

    const details: { uid: string; recovered: number }[] = [];

    for (const log of logs) {
      const uid = String(log.meta?.uid);
      const value = log.meta?.value as number;
      if (!uid || !value || value >= 0) continue;

      const recoverAmount = Math.abs(value / 2);

      const user = await this.User.findOneAndUpdate(
        { uid },
        { $inc: { point: recoverAmount } },
        { new: true },
      );

      if (!user) continue;

      logger?.info('5월 소모임 참여권 오류 보상', {
        type: 'point',
        sub: '소모임 티켓 정산',
        uid,
        value: recoverAmount,
      });

      details.push({ uid, recovered: recoverAmount });
    }

    return { recovered: details.length, details };
  }

  async testProcessScheduleForUser(userId: string) {
    const user = await this.User.findById(userId);
    if (!user) throw new Error(`User not found: ${userId}`);

    const before = {
      gatherTicket: user.ticket?.gatherTicket,
      groupStudyTicket: user.ticket?.groupStudyTicket,
      point: user.point,
      temperature: user.temperature?.temperature,
      gender: user.gender,
      membership: user.membership,
    };

    // --- processTicket 로직 (단일 유저) ---
    const temp = user.temperature?.temperature ?? 0;

    let gatherTicket: number;
    let groupStudyTicket: number;

    if (temp < 36.5) {
      gatherTicket = 1;
      groupStudyTicket = 2;
    } else if (temp < 38) {
      gatherTicket = 2;
      groupStudyTicket = 4;
    } else if (temp < 40) {
      gatherTicket = 3;
      groupStudyTicket = 4;
    } else if (temp < 42) {
      gatherTicket = 3;
      groupStudyTicket = 5;
    } else if (temp < 44) {
      gatherTicket = 4;
      groupStudyTicket = 5;
    } else {
      gatherTicket = 4;
      groupStudyTicket = 6;
    }

    if (user.gender === '여성') {
      gatherTicket += 1;
      groupStudyTicket += 1;
    }

    if (user.membership === 'newbie') {
      gatherTicket += 1;
      groupStudyTicket += 2;
    } else if (user.membership === 'manager') {
      gatherTicket += 2;
      groupStudyTicket += 4;
    }

    await this.User.updateOne(
      { _id: userId },
      {
        $set: {
          'ticket.gatherTicket': gatherTicket,
          'ticket.groupStudyTicket': groupStudyTicket,
        },
      },
    );

    const afterTicket = { gatherTicket, groupStudyTicket };

    // --- processGroupStudyAttend 로직 (단일 유저) ---
    const groups = await this.GroupStudy.find({
      'participants.user': userId,
      status: 'pending',
    });

    const deductions: {
      groupId: number;
      title: string;
      role: string;
      isMember: boolean;
      requiredTicket: number;
      ticketAfter: number;
      pointDeducted: number;
    }[] = [];

    for (const group of groups) {
      const par = group.participants.find((p) => p.user.toString() === userId);
      if (!par) continue;

      const isMember =
        (par.role as string) === 'regularMember' || par.role === 'admin';
      const requiredTicket = isMember
        ? group.requiredTicket - 1
        : group.requiredTicket;

      const currentUser = await this.User.findById(userId).select(
        'ticket point',
      );
      const currentTicket = currentUser?.ticket?.groupStudyTicket ?? 0;
      const actualDeduct = Math.min(requiredTicket, Math.max(0, currentTicket));
      const deficit = requiredTicket - actualDeduct;

      if (actualDeduct > 0) {
        await this.User.updateOne(
          { _id: userId },
          { $inc: { 'ticket.groupStudyTicket': -actualDeduct } },
        );
      }

      const ticketAfter = currentTicket - actualDeduct;
      let pointDeducted = 0;

      if (deficit > 0) {
        const currentPoint = currentUser?.point ?? 0;
        const deductAmount = Math.min(
          deficit * 1000,
          Math.max(0, currentPoint),
        );
        if (deductAmount > 0) {
          pointDeducted = -deductAmount;
          await this.User.updateOne(
            { _id: userId },
            { $inc: { point: pointDeducted } },
          );
        }
      }

      deductions.push({
        groupId: group.id,
        title: group.title,
        role: par.role,
        isMember,
        requiredTicket,
        ticketAfter,
        pointDeducted,
      });
    }

    const finalUser = await this.User.findById(userId);

    return {
      before,
      afterProcessTicket: afterTicket,
      deductions,
      after: {
        groupStudyTicket: finalUser?.ticket?.groupStudyTicket,
        point: finalUser?.point,
      },
    };
  }
}
