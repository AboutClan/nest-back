import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import dayjs, { Dayjs } from 'dayjs';
import { Model } from 'mongoose';
import { CollectionService } from 'src/collection/collection.service';
import {
  ATTEND_STUDY_POINT,
  CANCEL_VOTE_POINT,
  VOTE_POINT,
} from 'src/Constants/point';
import { ATTEND_STUDY_SCORE } from 'src/Constants/score';
import { convertUserToSummary } from 'src/convert';
import { IPlace } from 'src/place/place.entity';
import { IRealtime } from 'src/realtime/realtime.entity';
import { RequestContext } from 'src/request-context';
import { IUser } from 'src/user/user.entity';
import { UserService } from 'src/user/user.service';
import { strToDate } from 'src/utils/dateUtils';
import { now } from './util';
import {
  IAttendance,
  IParticipation,
  IVote,
  IVoteStudyInfo,
} from './vote.entity';

@Injectable()
export class VoteService {
  constructor(
    @InjectModel('Vote') private Vote: Model<IVote>,
    @InjectModel('User') private User: Model<IUser>,
    @InjectModel('Place') private Place: Model<IPlace>,
    @InjectModel('Realtime') private Realtime: Model<IRealtime>,
    private readonly collectionServiceInstance: CollectionService,
    private userServiceInstance: UserService,
  ) {}

  findOneVote = async (date: Date) =>
    await this.Vote.findOne({ date }).populate([
      'participations.place',
      'participations.attendences.user',
      'participations.absences.user',
    ]);

  async getArrivedPeriod(startDay: string, endDay: string) {
    try {
      let userArrivedInfo = await this.Vote.collection
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
    const token = RequestContext.getDecodedToken();

    try {
      const result = await this.Vote.exists({
        date,
        'participations.attendences.user': token.id, // 참석자 중 현재 사용자 존재 여부 확인
      });

      return result !== null; // 문서가 존재하면 true, 없으면 false
    } catch (err) {
      throw new Error('Error checking voting status');
    }
  }

  async getFilteredVoteOne(date: any) {
    const token = RequestContext.getDecodedToken();

    try {
      const vote: IVote = await this.getVote(date);
      const myInfo = await this.User.findOne({ uid: token.uid });

      const users = await this.User.find({
        location: token.location,
        weekStudyAccumulationMinutes: { $gt: 0 },
      }).sort({ weekStudyAccumulationMinutes: -1 });

      const rankNum = users.findIndex((user) => user.uid === myInfo?.uid) + 1;

      const findMyParticipation = vote?.participations?.find((par) =>
        par.attendences?.some((att) => (att.user as IUser)?.id === token.id),
      );

      if (findMyParticipation) {
        const data = {
          place: findMyParticipation.place,
          absences: findMyParticipation.absences,
          status: findMyParticipation.status,
          members: findMyParticipation.attendences?.map((who) => ({
            time: who.time,
            isMainChoice: who.firstChoice,
            attendance: {
              attendanceImage: who?.imageUrl,
              arrived: who?.arrived,
              arrivedMessage: who?.memo,
            },
            user: convertUserToSummary(who.user as IUser),
            comment: who?.comment,
          })),
        };
        return { data, rankNum };
      }

      const data = await this.Realtime.findOne({ date })
        .populate(['userList.user'])
        .lean();
      const findStudy = data?.userList?.find(
        (user) => (user.user as IUser)._id.toString() === token.id,
      );

      if (!findStudy) return;

      const filtered = data?.userList?.filter(
        (who) => who.place.name === findStudy?.place.name,
      );

      return {
        data: filtered?.map((props) => ({
          ...props,
          attendance: {
            attendanceImage: props?.image,
            arrived: props?.arrived,
            arrivedMessage: props?.memo,
          },
          user: {
            ...convertUserToSummary(props.user as IUser),
            comment: (props.user as IUser).comment,
          },
        })),
        rankNum,
      };
    } catch (err) {
      // 에러 메시지를 구체적으로 기록
      throw new Error(`Error fetching filtered vote data`);
    }
  }
  async getFilteredVote(date: any, location: string) {
    const token = RequestContext.getDecodedToken();

    try {
      const STUDY_RESULT_HOUR = 23;
      const vote: IVote = await this.getVote(date);

      const user = await this.User.findOne({ uid: token.uid });

      const studyPreference = user?.studyPreference;

      const filterStudy = (filteredVote: IVote) => {
        const voteDate = filteredVote?.date;

        // 위치에 맞는 참여자 필터링 (location이나 '전체'에 해당하는 것만)
        filteredVote.participations = filteredVote?.participations.filter(
          (participation) => {
            if (location === '전체') return true;
            const placeLocation = participation.place?.location;
            return placeLocation === location || placeLocation === '전체';
          },
        );

        // 유저 정보 없는 참석자 제거
        filteredVote.participations = filteredVote?.participations
          .map((par) => ({
            ...par,
            attendences: par?.attendences?.filter((who) => who?.user),
          }))
          .filter((par) => par.place?.brand !== '자유 신청');

        // isConfirmed 여부 확인
        const currentDate = dayjs().add(9, 'hour').startOf('day');
        const currentHours = dayjs().add(9, 'hour').hour();
        const selectedDate = dayjs(voteDate).add(9, 'hour').startOf('day');

        const isConfirmed =
          selectedDate.isBefore(currentDate) || // 선택한 날짜가 현재 날짜 이전인지
          (selectedDate.isSame(currentDate) &&
            currentHours >= STUDY_RESULT_HOUR); // 같은 날이고 특정 시간(STUDY_RESULT_HOUR)이 지났는지

        // 정렬에 사용할 함수들
        const getCount = (participation: IParticipation) => {
          if (!isConfirmed) return participation?.attendences?.length;
          return participation?.attendences?.filter((who) => who.firstChoice)
            .length;
        };

        const getStatusPriority = (status?: string) => {
          switch (status) {
            case 'open':
              return 1;
            case 'free':
              return 2;
            default:
              return 3;
          }
        };

        const getPlacePriority = (placeId?: string) => {
          if (!studyPreference?.place) return 3; // 선호 장소 없으면 기본 우선순위

          if (placeId === studyPreference.place.toString()) return 1; // 메인 장소 우선순위

          if (
            (studyPreference.subPlace as string[])
              .map((sub) => sub.toString())
              .includes(placeId as string)
          ) {
            return 2; // 서브 장소 우선순위
          }

          return 3; // 그 외 우선순위
        };

        // 정렬 수행
        filteredVote.participations = filteredVote.participations
          .map((par) => {
            const count = getCount(par); // getCount 호출을 한 번으로 줄임

            const statusPriority = getStatusPriority(par.status);

            const placePriority = getPlacePriority(par.place?._id.toString());

            return {
              ...par,
              count,
              statusPriority,
              placePriority,
            };
          })
          .sort((a, b) => {
            // 상태 우선순위 비교
            if (a.statusPriority !== b.statusPriority) {
              return a.statusPriority - b.statusPriority;
            }
            // 참석자 수 비교
            if (a.count !== b.count) {
              return (b?.count as number) - (a?.count as number);
            }
            // 장소 우선순위 비교
            return a.placePriority - b.placePriority;
          })
          .map(({ statusPriority, placePriority, count, ...rest }) => rest);

        filteredVote.participations = filteredVote.participations.filter(
          (par) => par?.place?.brand !== '자유 신청',
        );

        // 기본 모드일 경우 상위 3개만 반환

        return {
          date: filteredVote.date,
          participations: filteredVote.participations.map((par) => ({
            place: par.place,
            absences: par.absences,
            status: par.status,
            members:
              par.attendences?.map((who) => ({
                time: who.time,
                isMainChoice: who.firstChoice,
                attendance: {
                  attendanceImage: who?.imageUrl,
                  arrived: who?.arrived,
                  arrivedMessage: who?.memo,
                },
                user: convertUserToSummary(who.user as IUser),
                comment: who?.comment,
                // absenceInfo
              })) || [], // attendences가 없을 경우 빈 배열로 처리
          })),
        };
      };

      const data = await this.Realtime.findOne({ date })
        .populate(['userList.user'])
        .lean();
      const realTime =
        data?.userList?.map((props) => ({
          ...props,
          attendance: {
            attendanceImage: props?.image,
            arrived: props?.arrived,
            arrivedMessage: props?.memo,
          },
          user: convertUserToSummary(props.user as IUser),
        })) || [];

      return { ...filterStudy(vote), realTime };
    } catch (err) {
      // 에러 메시지를 구체적으로 기록
      throw new Error(`Error fetching filtered vote data`);
    }
  }

  //todo: 어디에 위치시킬지 고민
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
    const token = RequestContext.getDecodedToken();

    try {
      const { place, subPlace, start, end, memo }: IVoteStudyInfo = studyInfo;
      const vote = await this.getVote(date);

      if (!this.isVoting(date)) {
        this.userServiceInstance.updatePoint(VOTE_POINT, '스터디 투표');
      }

      await this.Realtime.updateOne(
        { date },
        {
          $pull: { userList: { user: token.id } },
        },
      );

      await this.Vote.updateOne(
        { date },
        {
          $pull: {
            'participations.$[].attendences': {
              'user.uid': token.uid,
            },
          },
        },
      );

      const attendance = {
        time: { start: start, end: end },
        user: token.id,
      } as IAttendance;

      //todo: 조금 신중히 수정
      //todo: free open 분리
      //memo는 개인 스터디 신청에 사용 (사전에 작성)
      vote.participations = vote.participations.map(
        (participation: IParticipation) => {
          const placeId = (participation.place as IPlace)._id.toString();
          const subPlaceIdArr = subPlace;

          if (placeId === place) {
            if (participation.status === 'dismissed') {
              participation.status = 'free';
            }
            return {
              ...participation,
              attendences: [
                ...(participation.attendences || []),
                { ...attendance, firstChoice: true, memo },
              ],
            };
          } else if (subPlaceIdArr?.includes(placeId)) {
            return {
              ...participation,
              attendences: [
                ...(participation.attendences || []),
                { ...attendance, firstChoice: false, memo },
              ],
            };
          }

          return participation;
        },
      );
      await vote.save();
    } catch (err) {
      throw new Error();
    }
  }

  //todo: test 필요
  async patchComment(date: any, comment: string) {
    const token = RequestContext.getDecodedToken();

    try {
      const userId = token.id?.toString();

      const updatedVote = await this.Vote.findOneAndUpdate(
        {
          date,
          'participations.attendences.user': userId,
          'participations.attendences.firstChoice': true,
        },
        {
          $set: {
            'participations.$[].attendences.$[att].comment.text': comment,
          },
        },
        {
          arrayFilters: [{ 'att.user': userId, 'att.firstChoice': true }],
          new: true,
        },
      );

      if (!updatedVote) throw new Error('Failed to update comment');
    } catch (err) {
      console.log(err);
      throw new Error();
    }
  }

  async patchVote(date: any, start: any, end: any) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.getVote(date);
    if (!vote) throw new Error();

    try {
      if (!start || !end) {
        throw new Error('Invalid start or end time');
      }

      // 유효한 투표를 찾고, 사용자의 출석 시간을 업데이트
      const updatedVote = await this.Vote.findOneAndUpdate(
        { date, 'participations.attendences.user': token.id },
        {
          $set: {
            'participations.$[].attendences.$[attendance].time.start': start,
            'participations.$[].attendences.$[attendance].time.end': end,
          },
        },
        {
          arrayFilters: [{ 'attendance.user': token.id }],
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
    const token = RequestContext.getDecodedToken();

    try {
      const voteDoc = await this.Vote.findOne({
        date,
        'participations.attendences.user': token.id,
      });
      if (voteDoc) {
        await this.Vote.updateOne(
          { date, 'participations.attendences.user': token.id },
          {
            $pull: {
              'participations.$[].attendences': { user: token.id },
            },
          },
        );
        this.userServiceInstance.updatePoint(
          CANCEL_VOTE_POINT,
          '스터디 투표 취소',
        );
      }
      return;
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
    const token = RequestContext.getDecodedToken();
    try {
      const result = await this.Vote.updateOne(
        {
          date,
          'participations.attendences.user': token.id,
          'participations.attendences.firstChoice': true,
        },
        {
          $addToSet: {
            'participations.$[].absences': {
              user: token.id,
              noShow: true,
              message,
            },
          },
        },
        {
          arrayFilters: [
            {
              'attendance.user': token.id,
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
    const vote = await this.Vote.findOne({ date }).populate([
      'participations.attendences.user',
      'participations.place',
    ]);
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

  async patchArrive(date: any, memo: any, endHour: any) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.getVote(date);
    const userData = await this.User.findOne({ uid: token.uid });

    if (!vote) throw new Error();

    try {
      const currentTime = now().add(9, 'hour');

      vote.participations.forEach((participation: any) => {
        participation.attendences.forEach((att: any) => {
          if (
            (att.user as IUser)._id?.toString() === token.id?.toString() &&
            att?.firstChoice
          ) {
            if (endHour) att.time.end = endHour;
            att.arrived = new Date();

            //memo가 빈문자열인 경우는 출석이 아닌 개인 스터디 신청에서 사용한 경우
            if (memo) att.memo = memo;
          }
        });
      });
      await vote.save();
      await userData?.save();

      const result = this.collectionServiceInstance.setCollectionStamp(
        token.id,
      );

      await this.userServiceInstance.updatePoint(
        ATTEND_STUDY_POINT,
        '스터디 출석',
      );
      await this.userServiceInstance.updateScore(
        ATTEND_STUDY_SCORE,
        '스터디 출석',
      );

      return result;
    } catch (err) {
      throw new Error();
    }
  }

  async patchConfirm(date: any) {
    const token = RequestContext.getDecodedToken();

    try {
      // 특정 날짜와 사용자의 출석 상태를 업데이트
      const result = await this.Vote.updateOne(
        { date, 'participations.attendences.user': token.id },
        {
          $set: {
            'participations.$[].attendences.$[attendance].confirmed': true,
          },
        },
        {
          arrayFilters: [{ 'attendance.user': token.id }],
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
    const token = RequestContext.getDecodedToken();

    const vote = await this.findOneVote(date);
    if (!vote) throw new Error();

    try {
      const result = await this.Vote.updateOne(
        {
          date,
          'participations.attendences.user': token.id,
        },
        {
          $pull: {
            'participations.$[].attendences': { user: token.id },
          },
          $push: {
            'participations.$[].absences': {
              user: token.id,
              noShow: false,
              message: '',
            },
          },
        },
        {
          arrayFilters: [{ 'attendance.user': token.id }],
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
    const token = RequestContext.getDecodedToken();

    try {
      const { start, end } = studyInfo;
      const user: any = await this.User.findOne(
        { uid: token.uid },
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
