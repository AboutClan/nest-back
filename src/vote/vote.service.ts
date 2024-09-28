import { Injectable } from '@nestjs/common';
import { JWT } from 'next-auth/jwt';
import {
  IAbsence,
  IAttendance,
  IVote,
  IVoteStudyInfo,
  Vote,
} from './entity/vote.entity';
import dayjs, { Dayjs } from 'dayjs';
import { findOneVote } from './util';
import { IUser, User } from 'src/user/entity/user.entity';
import { IPlace, Place } from 'src/place/entity/place.entity';
import { strToDate } from 'src/utils/dateUtils';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class VoteService {
  private token: JWT;
  constructor(
    @InjectModel('Vote') private Vote: Model<IVote>,
    @InjectModel(User.name) private User: Model<IUser>,
    @InjectModel(Place.name) private Place: Model<IPlace>,
    token?: JWT,
  ) {
    this.token = token as JWT;
  }

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

  async getVote(date: any): Promise<IVote> {
    try {
      let vote = await findOneVote(date);

      if (!vote) {
        const places = await this.Place.find({ status: 'active' });
        const participants = places.map((place) => {
          const isPrivate = place.brand === '자유 신청';
          return {
            place: place._id,
            attendences: [],
            absences: [],
            invitations: [],
            status: !isPrivate ? 'pending' : 'free',
          } as any;
        });

        await this.Vote.create({
          date,
          participations: participants,
        });

        vote = await findOneVote(date);
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
        .find((ObjId) => String(ObjId) === this.token.id);

      return isVoting;
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
    const startOfWeek = dayjs(date).startOf('isoWeek'); // ISO 8601 기준 주의 시작 (월요일)
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
          let vote = await findOneVote(date);
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

      if (isVoting) {
        vote.participations = vote.participations.map((participation) => ({
          ...participation,
          attendences: participation.attendences?.filter((attandence) => {
            return (
              (attandence.user as IUser)?.uid.toString() !==
              this.token.uid?.toString()
            );
          }),
        }));

        await vote.save();
      }

      const attendance = {
        time: { start: start, end: end },
        user: this.token.id,
      } as IAttendance;

      //memo는 개인 스터디 신청에 사용 (사전에 작성)

      vote.participations = vote.participations.map((participation) => {
        const placeId = (participation.place as IPlace)._id.toString();
        const subPlaceIdArr = subPlace;
        if (placeId === place) {
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
      });

      await vote.save();
    } catch (err) {
      throw new Error();
    }
  }

  async patchVote(date: any, start: any, end: any) {
    const vote = await this.getVote(date);
    if (!vote) throw new Error();

    try {
      if (start && end) {
        vote.participations.map((participation) => {
          participation.attendences?.map((attendance) => {
            if (
              (attendance.user as IUser)?.uid.toString() ===
              this.token.uid?.toString()
            ) {
              attendance.time.start = start;
              attendance.time.end = end;
            }
          });
        });

        await vote.save();
      } else {
        return new Error();
      }
    } catch (err) {
      throw new Error();
    }
  }

  async deleteVote(date: any) {
    try {
      const vote = await this.getVote(date);
      if (!vote) throw new Error();

      const isVoting = vote.participations
        .flatMap((participation) =>
          participation.attendences?.map((attendence) => {
            return (attendence.user as IUser)?._id;
          }),
        )
        .find((ObjId) => String(ObjId) === this.token.id);

      if (!isVoting) {
        throw new Error();
      }

      vote.participations = vote.participations.map((participation) => ({
        ...participation,
        attendences: participation.attendences?.filter((attendance) => {
          return (
            (attendance.user as IUser)?.uid.toString() !==
            this.token.uid?.toString()
          );
        }),
      }));

      await vote.save();
    } catch (err) {
      throw new Error();
    }
  }

  async getAbsence(date: any) {
    try {
      const result: any[] = [];

      const vote = await this.getVote(date);
      if (!vote) throw new Error();

      vote?.participations.map((participation) => {
        participation.absences?.map((absence) => {
          result.push({
            uid: (absence.user as IUser)?.uid,
            message: absence.message,
          });
        });
      });

      return result;
    } catch (err) {
      throw new Error();
    }
  }

  async setAbsence(date: any, message: string) {
    try {
      const vote = await this.getVote(date);

      await vote?.participations.map((participation) => {
        participation.attendences?.map((attendence) => {
          if (
            (attendence.user as IUser)?.uid.toString() ===
              this.token.uid?.toString() &&
            attendence.firstChoice
          ) {
            if (
              !participation.absences?.some(
                (absence) =>
                  (absence.user as IUser)?.uid.toString() ===
                  this.token.uid?.toString(),
              )
            )
              participation.absences = [
                ...(participation.absences || []),
                {
                  user: this.token.id as string,
                  noShow: true,
                  message,
                },
              ];
          }
        });
      });

      await vote?.save();

      return;
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

  async deleteField() {
    return null;
  }

  async patchArrive(date: any, memo: any) {
    const vote = await this.getVote(date);
    if (!vote) throw new Error();

    try {
      const currentTime = now().add(9, 'hour');

      vote.participations.forEach((participation: any) => {
        participation.attendences.forEach((att: any) => {
          if (
            (att.user as IUser)._id?.toString() === this.token.id?.toString() &&
            att?.firstChoice
          ) {
            att.arrived = currentTime.toDate();
            //memo가 빈문자열인 경우는 출석이 아닌 개인 스터디 신청에서 사용한 경우
            if (memo) att.memo = memo;
          }
        });
      });

      await vote.save();
      return true;
    } catch (err) {
      throw new Error();
    }
  }

  async patchConfirm(date: any) {
    try {
      const vote = await findOneVote(date);
      if (!vote) throw new Error();

      vote.participations.forEach((participation) => {
        participation.attendences?.forEach((attendance) => {
          if (
            (attendance.user as IUser).uid.toString() ===
            this.token.uid?.toString()
          ) {
            attendance.confirmed = true;
          }
        });
      });
    } catch (err) {
      throw new Error();
    }
  }

  async patchDismiss(date: any) {
    const vote = await findOneVote(date);
    if (!vote) throw new Error();

    try {
      vote.participations.forEach((participation) => {
        const isTargetParticipation = !!participation.attendences?.find(
          (att) =>
            (att.user as IUser)?.uid.toString() === this.token.uid?.toString(),
        );
        if (isTargetParticipation) {
          participation.attendences = participation.attendences?.filter(
            (att) =>
              (att.user as IUser)?.uid.toString() !==
              this.token.uid?.toString(),
          );
          participation.absences = [
            ...(participation.absences as IAbsence[]),
            { user: this.token._id, noShow: false, message: '' } as IAbsence,
          ];
        }
      });

      await vote.save();
    } catch (err) {
      throw new Error();
    }
  }

  async getStart(date: any) {
    try {
      const vote = await findOneVote(date);
      if (!vote) return [];

      const result: any = [];
      vote.participations.map((participation) => {
        if (
          ['open', 'free'].includes(participation.status as string) &&
          participation.startTime
        ) {
          const openInfo = {
            place_id: participation.place?._id,
            startTime: participation.startTime,
          };
          result.push(openInfo);
        }
      });

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
      const vote = await findOneVote(date);

      if (!vote) return;

      vote.participations.forEach(async (participation) => {
        if (participation.place?._id.toString() === placeId) {
          participation.status = 'free';
          participation.attendences;
          await vote.save();
        }
      });

      return;
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
