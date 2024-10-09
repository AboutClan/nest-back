import { Inject, Injectable, Scope } from '@nestjs/common';
import { JWT } from 'next-auth/jwt';
import {
  IAbsence,
  IAttendance,
  IVote,
  IVoteStudyInfo,
  Vote,
} from './entity/vote.entity';
import dayjs, { Dayjs } from 'dayjs';
import { now } from './util';
import { IUser } from 'src/user/entity/user.entity';
import { IPlace } from 'src/place/entity/place.entity';
import { strToDate } from 'src/utils/dateUtils';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class VoteService {
  private token: JWT;
  constructor(
    @InjectModel('Vote') private Vote: Model<IVote>,
    @InjectModel('User') private User: Model<IUser>,
    @InjectModel('Place') private Place: Model<IPlace>,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  findOneVote = async (date: Date) =>
    await this.Vote.findOne({ date }).populate([
      'participations.place',
      'participations.attendences.user',
      'participations.absences.user',
    ]);

  async getArrivedPeriod(startDay: string, endDay: string) {
    try {
      let userArrivedInfo = await Vote.collection
        .aggregate([
          {
            $match: {
              date: {
                $gte: dayjs(startDay).toDate(),
                $lt: dayjs(endDay).toDate(),
              },
            },
          },
          {
            $unwind: '$participations',
          },
          {
            $unwind: '$participations.attendences',
          },
          {
            $lookup: {
              from: 'places',
              localField: 'participations.place',
              foreignField: '_id',
              as: 'place',
            },
          },
          {
            $project: {
              date: '$date',
              attendence: '$participations.attendences',
              place: '$place',
              status: '$participations.status',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'attendence.user',
              foreignField: '_id',
              as: 'attendence.user',
            },
          },
          {
            $unwind: '$place',
          },
          {
            $unwind: '$attendence.user',
          },
          {
            $project: {
              date: '$date',
              name: '$attendence.user.name',
              uid: '$attendence.user.uid',
              placeId: '$place._id',
              location: '$place.location',
              arrived: '$attendence.arrived',
              status: '$status',
            },
          },
        ])
        .toArray();

      //open 기록만 가져오는게 아닌 open 및 free 가져오는 걸로 변경
      userArrivedInfo = userArrivedInfo.filter(
        (info) => ['open', 'free'].includes(info.status) && info.arrived,
      );

      const results = userArrivedInfo.reduce((acc, obj) => {
        const date = dayjs(obj.date).format('YYYY-MM-DD').toString();
        const placeId = obj.placeId;
        const uid = obj.uid;
        const name = obj.name;

        const idx = acc.findIndex((el: any) => el.date === date);
        if (idx === -1) {
          acc.push({ date, arrivedInfoList: [{ placeId, uid, name }] });
        } else {
          acc[idx].arrivedInfoList.push({ placeId, uid, name });
        }

        return acc;
      }, []);

      results.forEach((result: any) => {
        result.arrivedInfoList = result.arrivedInfoList.reduce(
          (acc: any, obj: any) => {
            const placeId = obj.placeId.toString();
            const uid = obj.uid;
            const name = obj.name;
            const idx = acc.findIndex((el: any) => el.placeId === placeId);

            if (idx === -1) {
              acc.push({ placeId, arrivedInfo: [{ uid, name }] });
            } else {
              acc[idx].arrivedInfo.push({ uid, name });
            }

            return acc;
          },
          [],
        );
      });

      return results;
    } catch (err: any) {
      throw new Error(err);
    }
  }

  //todo: participatns => places이름 변경 필요.
  async getVote(date: any): Promise<IVote> {
    try {
      let vote = await this.findOneVote(date);

      if (!vote) {
        const places = await this.Place.find({ status: 'active' });
        const participants = places.map((place) => {
          return {
            place: place._id,
            attendences: [],
            absences: [],
            invitations: [],
            status: place.brand === '자유 신청' ? 'free' : 'pending',
          } as any;
        });

        await this.Vote.create({
          date,
          participations: participants,
        });

        vote = await this.findOneVote(date);
      }

      return vote as IVote;
    } catch (err) {
      throw new Error();
    }
  }

  async isVoting(date: any) {
    try {
      let vote = await this.getVote(date);

      const isVoting = vote.participations
        .flatMap((participation) =>
          participation.attendences?.map((attendance) => {
            return (attendance.user as IUser)?._id;
          }),
        )
        .find((ObjId) => String(ObjId) == this.token.id);

      return isVoting ? true : false;
    } catch (err) {
      throw new Error();
    }
  }

  /** 인접한 지역들은 공통된 스터디 장소를 추가하고자 함. 해당 지역들 따로 저장해서 체크하면 좋을 거 같은데 일단은 하드코딩으로 해둘게요. */
  async getFilteredVote(date: any, location: string) {
    try {
      const filteredVote = await this.getVote(date);

      filteredVote.participations = filteredVote?.participations.filter(
        (participation) => {
          const placeLocation = participation.place?.location;
          return placeLocation === location || placeLocation === '전체';
        },
      );
      //유저 정보 없는 경우 제거
      filteredVote?.participations?.forEach((par) => {
        par.attendences = par?.attendences?.filter((who) => who?.user);
      });
      return filteredVote;
    } catch (err) {
      throw new Error();
    }
  }

  async getWeekDates(date: any) {
    const startOfWeek = dayjs(date).startOf('isoWeek' as dayjs.OpUnitType); // ISO 8601 기준 주의 시작 (월요일)
    const weekDates = [];

    for (let i = 0; i < 7; i++) {
      weekDates.push(startOfWeek.add(i, 'day').toDate());
    }

    return weekDates;
  }

  async getRangeDates(startDay: any, endDay: any) {
    startDay = dayjs(startDay);
    endDay = dayjs(endDay);

    const dates = [];

    let currentDate: Dayjs = startDay;

    while (currentDate.isBefore(endDay) || currentDate.isSame(endDay)) {
      dates.push(currentDate.toDate());
      currentDate = currentDate.add(1, 'day');
    }

    return dates;
  }

  async getParticipantsCnt(location: string, startDay: any, endDay: any) {
    try {
      const dateList = await this.getRangeDates(startDay, endDay);
      const cntList = new Map<Date, number>();
      const totalCntList = new Map<Date, number>(); // totalCntList 추가

      dateList.forEach((date) => {
        cntList.set(date, 0);
        totalCntList.set(date, 0); // 초기화
      });

      await Promise.all(
        dateList.map(async (date, i) => {
          let vote = await this.findOneVote(date);
          if (!vote) return cntList;

          const map = new Map();
          const totalMap = new Map();
          let cnt = 0;
          let totalCnt = 0;

          vote.participations.forEach((participation) => {
            participation.attendences?.forEach((attendence) => {
              if (attendence.user != null && attendence.firstChoice) {
                if (!map.has((attendence.user as IUser).uid)) {
                  if (
                    participation.place?.location === location &&
                    participation.place?.brand !== '자유 신청'
                  ) {
                    map.set((attendence.user as IUser).uid, 1);
                    cnt++;
                  }
                }
                if (!totalMap.has((attendence.user as IUser).uid)) {
                  totalMap.set((attendence.user as IUser).uid, 1);
                  totalCnt++;
                }
              }
            });
          });

          cntList.set(date, cnt);
          totalCntList.set(date, totalCnt);
        }),
      );
      let array = Array.from(dateList, (date) => ({
        date,
        value: cntList.get(date),
        totalValue: totalCntList.get(date),
      }));
      return array;
    } catch (err) {
      throw new Error();
    }
  }

  async getFilteredVoteByDate(date: any, location: string) {
    try {
      const dateList = await this.getWeekDates(date);

      const result: any[] = [];

      await Promise.all(
        dateList.map(async (date2) => {
          const filteredVote = await this.getVote(date2);

          filteredVote.participations = filteredVote?.participations.filter(
            (participation) => {
              const placeLocation = participation.place?.location;
              return placeLocation === location || placeLocation === '전체';
            },
          );
          //유저 정보 없는 경우 제거
          filteredVote?.participations?.forEach((par) => {
            par.attendences = par?.attendences?.filter((who) => who?.user);
          });

          result.push(filteredVote);
        }),
      );
      return result;
    } catch (err) {
      throw new Error();
    }
  }

  async setVote(date: any, studyInfo: IVoteStudyInfo) {
    try {
      const { place, subPlace, start, end, memo }: IVoteStudyInfo = studyInfo;
      const isVoting = await this.isVoting(date);
      const vote = await this.getVote(date);

      //vote 돼있는 유저면 삭제 기능
      if (isVoting) {
        // 사용자 UID로 투표한 attendance를 삭제
        await this.Vote.updateOne(
          { date },
          {
            $pull: {
              // `participations` 배열 내부의 `attendences`에서 해당 사용자의 UID와 일치하는 참석 기록을 제거
              'participations.$[].attendences': {
                user: this.token.id?.toString(),
              },
            },
          },
        );
      }

      // if (isVoting) {
      //   vote.participations = vote.participations.map((participation) => ({
      //     ...participation,
      //     attendences: participation.attendences?.filter((attandence) => {
      //       return (
      //         (attandence.user as IUser)?.uid.toString() !==
      //         this.token.uid?.toString()
      //       );
      //     }),
      //   }));

      //   await vote.save();
      // }

      const attendance = {
        time: { start: start, end: end },
        user: this.token.id,
      } as IAttendance;

      console.log(attendance);
      //memo는 개인 스터디 신청에 사용 (사전에 작성)

      await this.Vote.updateOne(
        { date }, // 날짜가 일치하는 vote 문서 찾기
        {
          $push: {
            'participations.$[main].attendences': {
              ...attendance,
              firstChoice: true,
              memo,
            }, // 메인 장소에 참석 정보 추가
            'participations.$[sub].attendences': {
              ...attendance,
              firstChoice: false,
              memo,
            }, // 서브 장소에 참석 정보 추가
          },
        },
        {
          arrayFilters: [
            { 'main.place': place }, // 메인 장소 필터
            { 'sub.place': { $in: subPlace } }, // 서브 장소 필터
          ],
          new: true,
        },
      );

      // vote.participations = vote.participations.map((participation) => {
      //   const placeId = (participation.place as IPlace)._id.toString();
      //   const subPlaceIdArr = subPlace;
      //   if (placeId === place) {
      //     return {
      //       ...participation,
      //       attendences: [
      //         ...(participation.attendences || []),
      //         { ...attendance, firstChoice: true, memo },
      //       ],
      //     };
      //   } else if (subPlaceIdArr?.includes(placeId)) {
      //     return {
      //       ...participation,
      //       attendences: [
      //         ...(participation.attendences || []),
      //         { ...attendance, firstChoice: false, memo },
      //       ],
      //     };
      //   }
      //   return participation;
      // });

      await vote.save();
    } catch (err) {
      throw new Error();
    }
  }

  async patchVote(date: any, start: any, end: any) {
    const vote = await this.getVote(date);
    if (!vote) throw new Error();

    try {
      if (!start || !end) {
        throw new Error('Invalid start or end time');
      }

      // 유효한 투표를 찾고, 사용자의 출석 시간을 업데이트
      const updatedVote = await this.Vote.findOneAndUpdate(
        { date, 'participations.attendences.user': this.token.id },
        {
          $set: {
            'participations.$[].attendences.$[attendance].time.start': start,
            'participations.$[].attendences.$[attendance].time.end': end,
          },
        },
        {
          arrayFilters: [{ 'attendance.user': this.token.id }],
          new: true, // 업데이트된 문서 반환
        },
      );

      if (!updatedVote) {
        throw new Error('Vote not found or update failed');
      }

      return updatedVote;
    } catch (err) {
      console.log(err);
      throw new Error();
    }
  }

  async deleteVote(date: any) {
    try {
      const result = await this.Vote.updateOne(
        { date, 'participations.attendences.user': this.token.id },
        {
          $pull: {
            'participations.$[].attendences': { user: this.token.id },
          },
        },
      );

      // result.nModified를 통해 수정된 문서가 있는지 확인
      if (result.modifiedCount === 0) {
        throw new Error('No matching vote found or user not participating');
      }
    } catch (err) {
      throw new Error();
    }
  }

  async getAbsence(date: any) {
    try {
      const vote = await this.Vote.findOne(
        { date },
        { 'participations.absences': 1 },
      )
        .populate('participations.absences.user')
        .lean();
      if (!vote) throw new Error('Vote not found');

      // 결석 정보를 배열 형태로 수집
      const result = vote.participations.flatMap(
        (participation) =>
          participation.absences?.map((absence) => ({
            uid: (absence.user as IUser)?.uid,
            message: absence.message,
          })) || [],
      );

      return result;
    } catch (err) {
      throw new Error();
    }
  }

  async setAbsence(date: any, message: string) {
    try {
      const result = await this.Vote.updateOne(
        {
          date,
          'participations.attendences.user': this.token.id,
          'participations.attendences.firstChoice': true,
        },
        {
          $addToSet: {
            'participations.$[].absences': {
              user: this.token.id,
              noShow: true,
              message,
            },
          },
        },
        {
          arrayFilters: [
            {
              'attendance.user': this.token.id,
              'attendance.firstChoice': true,
            },
          ],
        },
      );

      // 업데이트가 이루어지지 않은 경우 에러 처리
      if (result.modifiedCount === 0) {
        throw new Error(
          'Failed to set absence or no matching attendance found.',
        );
      }
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async getArrived(date: any) {
    const vote = await this.getVote(date);
    if (!vote) throw new Error();

    try {
      const arriveInfo: any = [];

      vote.participations.forEach((participation: any) => {
        const arriveForm: any = {};
        arriveForm[participation.place.fullname] = [];
        if (['open', 'free'].includes(participation.status as string)) {
          participation.attendences?.forEach((att: any) => {
            if (att.arrived) {
              arriveForm[participation.place.fullname].push({
                location: participation.place.fullname,
                spaceId: participation.place._id,
                uid: (att.user as IUser)?.uid,
                arrived: att.arrived,
              });
            }
          });
        }
        arriveInfo.push(arriveForm);
      });

      return arriveInfo;
    } catch (err) {
      throw new Error();
    }
  }

  async patchArrive(date: any, memo: any) {
    const vote = await this.getVote(date);
    const currentTime = now().add(9, 'hour').toDate();

    if (!vote) throw new Error();

    try {
      const result = await this.Vote.updateOne(
        {
          date,
          'participations.attendences.user': this.token.id,
          'participations.attendences.firstChoice': true,
        },
        {
          $set: {
            'participations.$[].attendences.$[attendance].arrived': currentTime,
            ...(memo && {
              'participations.$[].attendences.$[attendance].memo': memo,
            }), // memo가 있을 때만 업데이트
          },
        },
        {
          arrayFilters: [
            {
              'attendance.user': this.token.id,
              'attendance.firstChoice': true,
            },
          ],
        },
      );

      if (result.modifiedCount === 0) {
        throw new Error('No matching attendance found or update failed');
      }

      return true;
    } catch (err) {
      throw new Error();
    }
  }

  async patchConfirm(date: any) {
    try {
      // 특정 날짜와 사용자의 출석 상태를 업데이트
      const result = await this.Vote.updateOne(
        { date, 'participations.attendences.user': this.token.id },
        {
          $set: {
            'participations.$[].attendences.$[attendance].confirmed': true,
          },
        },
        {
          arrayFilters: [{ 'attendance.user': this.token.id }],
        },
      );

      if (result.modifiedCount === 0) {
        throw new Error('No matching attendance found or update failed');
      }

      return true;
    } catch (err) {
      throw new Error(`Failed to confirm attendance: ${err.message}`);
    }
  }

  async patchDismiss(date: any) {
    const vote = await this.findOneVote(date);
    if (!vote) throw new Error();

    try {
      const result = await this.Vote.updateOne(
        {
          date,
          'participations.attendences.user': this.token.id,
        },
        {
          $pull: {
            'participations.$[].attendences': { user: this.token.id },
          },
          $push: {
            'participations.$[].absences': {
              user: this.token.id,
              noShow: false,
              message: '',
            },
          },
        },
        {
          arrayFilters: [{ 'attendance.user': this.token.id }],
        },
      );

      if (result.modifiedCount === 0) {
        throw new Error('No matching participation found or update failed');
      }

      return true;
    } catch (err) {
      throw new Error();
    }
  }

  async getStart(date: any) {
    try {
      const result = await this.Vote.aggregate([
        { $match: { date } }, // 날짜 기준으로 필터링
        { $unwind: '$participations' }, // participations 배열을 펼침
        {
          $match: {
            'participations.status': { $in: ['open', 'free'] }, // status 필터링
            'participations.startTime': { $exists: true }, // startTime이 있는 참여자만
          },
        },
        {
          $project: {
            _id: 0, // _id 필드 제외
            place_id: '$participations.place', // place._id 필드만 포함
            startTime: '$participations.startTime', // startTime 필드 포함
          },
        },
      ]);

      return result;
    } catch (err) {
      throw new Error();
    }
  }

  async quickVote(
    date: any,
    studyInfo: Omit<IVoteStudyInfo, 'place' | 'subPlace'>,
  ) {
    try {
      const { start, end } = studyInfo;
      const user: any = await this.User.findOne(
        { uid: this.token.uid },
        'studyPreference',
      );
      let { place, subPlace } = user.studyPreference;

      if (!place) {
        return false;
      }

      place = { _id: place.toString() };
      subPlace = subPlace.map((_id: any) => {
        return { _id: _id.toString() };
      });

      await this.setVote(date, { start, end, place, subPlace });

      return true;
    } catch (err) {
      throw new Error();
    }
  }

  async setFree(date: any, placeId: any) {
    try {
      const result = await this.Vote.updateOne(
        {
          date, // 특정 날짜의 투표 필터링
          'participations.place': placeId, // placeId가 일치하는 participation 필터링
        },
        {
          $set: { 'participations.$[participation].status': 'free' }, // status 업데이트
        },
        {
          arrayFilters: [
            { 'participation.place': placeId }, // 특정 placeId를 가진 participation만 업데이트
          ],
          new: true,
        },
      );

      // 업데이트 결과 확인
      if (result.modifiedCount === 0) {
        throw new Error('No matching participation found or update failed');
      }

      return true;
    } catch (err) {
      throw new Error();
    }
  }

  async getArriveCheckCnt() {
    try {
      const arriveCheckCnt = await this.Vote.collection
        .aggregate([
          {
            $match: {
              date: {
                $gte: strToDate('2023-12-03').toDate(),
                $lte: strToDate('2023-12-04').toDate(),
              },
            },
          },
          {
            $unwind: '$participations',
          },
          {
            $unwind: '$participations.attendences',
          },
          {
            $project: {
              attendence: '$participations.attendences',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'attendence.user',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $project: {
              arrived: '$attendence.arrived',
              uid: '$user.uid',
            },
          },
        ])
        .toArray();

      const result = new Map();
      arriveCheckCnt.forEach((info: any) => {
        if (info.uid[0] && info.hasOwnProperty('arrived')) {
          if (result.has(info.uid[0])) {
            const current = result.get(info.uid[0]);
            result.set(info.uid[0], current + 1);
          } else {
            result.set(info.uid[0], 1);
          }
        }
      });
      return Object.fromEntries(result);
    } catch (err: any) {
      throw new Error(err);
    }
  }
}
