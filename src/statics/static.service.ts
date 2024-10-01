import { JWT } from 'next-auth/jwt';
import { DatabaseError } from '../errors/DatabaseError';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser, User } from 'src/user/entity/user.entity';
import { ILog, Log } from 'src/logz/entity/log.entity';
import { RequestContext } from 'src/request-context';

export default class StaticService {
  private token: JWT;
  constructor(
    @InjectModel(User.name) private User: Model<IUser>,
    @InjectModel(Log.name) private Log: Model<ILog>,
  ) {
    this.token = RequestContext.getDecodedToken();
  }

  async roleCheck() {
    const authorized = ['previliged', 'manager'];
    const user = await this.User.findOne({ uid: this.token.uid }).select(
      'role',
    );
    if (!user || !user.role) return false;

    if (authorized.includes(user.role)) return true;
    else return false;
  }

  // 공통적으로 사용되는 aggregation 함수
  async aggregateLogs(message: string, groupFields: string[], period: any) {
    const groupId = groupFields.reduce((acc: any, field) => {
      acc[field] = `$meta.${field}`;
      return acc;
    }, {});

    return await this.Log.collection
      .aggregate([
        {
          $match: {
            message: message, // message 필터링
            timestamp: {
              $gte: period.firstDay, // 한 달 이내의 timestamp 필터링
              $lte: period.lastDay, // 한 달 이내의 timestamp 필터링
            },
          },
        },
        {
          $group: {
            _id: groupId, // groupFields 배열에 있는 모든 필드로 그룹화
            count: { $sum: 1 }, // 각 그룹의 개수를 세어 count에 저장
          },
        },
        {
          $sort: { count: -1 }, // count 기준으로 내림차순 정렬
        },
      ])
      .toArray();
  }

  getFirstAndLastDay(dateString: string = '2024-08-15') {
    // 문자열을 Date 객체로 변환 (YYYY-MM-DD 형식)
    const inputDate = new Date(dateString);

    // 해당 달의 첫 번째 날 (해당 년, 월의 1일)
    const firstDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), 1);

    // 해당 달의 마지막 날 (해당 년, 월 + 1의 0일은 이전 달의 마지막 날을 의미)
    const lastDay = new Date(
      inputDate.getFullYear(),
      inputDate.getMonth() + 1,
      0,
    );

    return { firstDay, lastDay };
  }

  async getUserInSameLocation(date: string) {
    const dateInfo = this.getFirstAndLastDay(date);

    const manager = await this.User.findById(this.token.id);
    if (!manager) throw new DatabaseError('no user');
    const managerLocation = manager.location;

    const usersInSameLocation = await this.User.find({
      location: managerLocation,
    }).select('uid name');

    const selfStudy = await this.aggregateLogs(
      '개인 스터디 인증',
      ['uid'],
      dateInfo,
    );
    const attend = await this.aggregateLogs(
      '스터디 출석',
      ['uid', 'type'],
      dateInfo,
    );
    const scoreOnlyAttend = attend.filter((item) => item._id.type === 'score');

    const gather = await this.aggregateLogs(
      '번개 모임 참여',
      ['uid'],
      dateInfo,
    );
    const group = await this.aggregateLogs('소모임 가입', ['uid'], dateInfo);

    const mapUserData = (
      userArray: any[],
      logArray: any[],
      logField: string,
    ) => {
      return userArray.map((user) => {
        const matched = logArray.find((log) => user.uid == log._id.uid);
        const userObj =
          typeof user.toJSON === 'function' ? user.toJSON() : user;
        if (matched) return { ...userObj, [logField]: matched.count };
        return { ...userObj, [logField]: 0 };
      });
    };

    let updatedArr = mapUserData(
      usersInSameLocation,
      selfStudy,
      'selfStudyCnt',
    );
    updatedArr = mapUserData(updatedArr, scoreOnlyAttend, 'attendCnt');
    updatedArr = mapUserData(updatedArr, gather, 'gatherCnt');
    updatedArr = mapUserData(updatedArr, group, 'groupCnt');

    const cleanedArr = updatedArr.map((obj) => {
      const { uid, ...rest } = obj;
      return rest;
    });

    return cleanedArr;
  }

  async monthlyStatics() {}
}
