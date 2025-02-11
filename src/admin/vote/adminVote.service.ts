import { Injectable, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import dayjs, { Dayjs } from 'dayjs';
import { Model } from 'mongoose';
import { strToDate } from 'src/utils/dateUtils';
import { IAttendance, IParticipation, IVote } from 'src/vote/vote.entity';
import { findOneVote, now } from 'src/vote/util';

type voteTime = { start: Dayjs | Date; end: Dayjs | Date };

@Injectable({ scope: Scope.DEFAULT })
export default class AdminVoteService {
  constructor(@InjectModel('Vote') private Vote: Model<IVote>) {}

  checkTimeOverlap = (timeArr: voteTime[]) => {
    timeArr.sort((a, b) => (a.end.toString() > b.end.toString() ? -1 : 1));
    let endTime = timeArr[0].end;
    timeArr.sort((a, b) => (a.start.toString() > b.start.toString() ? 1 : -1));
    let startTime = timeArr[0].start;

    const arr: any[] = [];
    while (startTime <= endTime) {
      arr.push(0);
      timeArr.forEach((time) => {
        if (time.start <= startTime && startTime <= time.end) {
          arr[arr.length - 1]++;
        }
      });

      let overlapCnt = 0;
      for (let i = 0; i < arr.length; i++) {
        //3명 이상 겹치는 시간  1시간 이상인지 확인
        if (arr[i] >= 3) overlapCnt++;
        else overlapCnt = 0;
        if (overlapCnt >= 3) return timeArr[1];
      }
      startTime = dayjs(startTime).add(30, 'minutes').toDate();
    }
    return null;
  };

  checkStudyOpen = (type: 'onlyFirst' | 'all', atts?: IAttendance[]) => {
    const timeObj: voteTime[] = [];
    atts?.forEach((att) => {
      if (type === 'onlyFirst' ? att.firstChoice : true) {
        if (att.time.start && att.time.end) {
          timeObj.push({
            start: att.time.start,
            end: att.time.end,
          });
        }
      }
    });
    return timeObj;
  };

  setStudyOpen = (participation: IParticipation, resultTime: any) => {
    participation.status = 'open';
    participation.startTime = resultTime.start as Date;
    participation.endTime = resultTime.end as Date;
  };

  async confirm(dateStr: string) {
    const date = strToDate(dateStr).toDate();
    const vote = await this.Vote.findOne({ date });

    const failure = new Set();

    const participations = vote?.participations;

    try {
      if (participations?.some((p) => p.status === 'pending')) {
        //1지망만으로 매칭
        participations?.forEach((participation) => {
          if (participation.status === 'free') return;

          const timeObj = this.checkStudyOpen(
            'onlyFirst',
            participation.attendences,
          );

          let result;
          if (timeObj.length) result = this.checkTimeOverlap(timeObj);

          if (result) this.setStudyOpen(participation, result);
          else participation.status = 'dismissed';
        });
        //1지망 투표 매칭에 실패한 사람들 failure에 추가
        participations?.forEach((participation) => {
          if (participation.status === 'dismissed') {
            participation.attendences?.forEach((attendance) => {
              if (attendance.firstChoice) {
                failure.add(attendance.user.toString());
              }
            });
          }
        });

        //1지망 투표 매칭에 실패한 사람들 중 오픈된 장소에 2지망 넣었으면 거기로 이동
        participations?.forEach((participation) => {
          if (participation.status === 'open') {
            participation.attendences?.forEach((attendance) => {
              const user = attendance.user.toString;
              if (failure.has(user)) {
                attendance.firstChoice = true;
                failure.delete(user);
              }
            });
          }
        });

        //실패한 장소에서 2지망 투표한 사람들끼리 오픈할 수 있는지 확인
        //성공한 사람들이 dismissed에 있는 경우 제거가 되지만, 순차적으로 진행되기 때문에 뒤에서 확정난 인원은 앞에서는 제거가 안되었음.

        participations?.forEach((participation) => {
          if (participation.status === 'dismissed') {
            //이미 성공한 사람들은 제거
            participation.attendences = participation.attendences?.filter(
              (attendance) => failure.has(attendance.user.toString()),
            );

            const timeObj = this.checkStudyOpen(
              'all',
              participation.attendences,
            );

            let result;
            if (timeObj.length) result = this.checkTimeOverlap(timeObj);

            if (result) {
              this.setStudyOpen(participation, result);
              participation.attendences?.forEach((attendance) => {
                attendance.firstChoice = true;
                failure.delete(attendance.user.toString());
              });
            } else participation.status = 'dismissed';
          }
        });

        //한번 더 open된 장소에 신청이 되어 있는 경우는 거기로 이동(2지망 투표자)
        participations?.forEach((participation) => {
          if (participation.status === 'open') {
            participation.attendences?.forEach((attendance) => {
              if (failure.has(attendance.user.toString())) {
                attendance.firstChoice = true;
                failure.delete(attendance.user.toString());
              }
            });
          }
        });

        //한번 더 dismissed에서 이미 성공한 사람들을 제거함. 실패한 사람들인 failure에 있는 경우들만 남김.
        participations?.forEach((participation) => {
          if (participation.status === 'dismissed') {
            participation.attendences = participation.attendences?.filter(
              (attendance) => failure.has(attendance.user.toString()),
            );
          }
        });
        participations?.forEach((participation) => {
          participation.attendences = participation.attendences?.filter(
            (attendance) => attendance.firstChoice === true,
          );
        });

        //유저가 3명 이하에 dismissed이면 free로
        participations?.forEach((participation) => {
          if (
            participation.status === 'dismissed' &&
            participation.attendences
          ) {
            if (participation.attendences.length == 2)
              participation.status = 'free';
            else if (participation.attendences.length == 1)
              participation.status = 'dismissed';
          }
        });

        await vote?.save();
      }
    } catch (err) {
      throw new Error();
    }

    return;
  }

  async waitingConfirm(dateStr: string) {
    try {
      const date = strToDate(dateStr).toDate();
      const vote = await this.Vote.findOne({ date });

      vote?.participations.forEach((participation) => {
        if (participation.attendences?.length === 0) {
          participation.status = 'dismissed';
        } else {
          participation.status = 'waiting_confirm';
        }
      });

      await vote?.save();
    } catch (err) {
      throw new Error();
    }
    return;
  }

  async deleteVote() {
    try {
      const day = now().add(2, 'days').toDate();
      await this.Vote.deleteMany({ date: { $gte: day } });
    } catch (err) {
      throw new Error();
    }
    return;
  }
  async voteStatusReset(date: any) {
    try {
      const vote = await findOneVote(strToDate(date).toDate());
      if (!vote) throw new Error();

      vote.participations.forEach((participation) => {
        if (participation.status !== 'free') {
          participation.status = 'pending';
        }
      });
      await vote.save();
    } catch (err) {
      throw new Error();
    }
  }
  async getAdminStudyRecord(
    startDay: string,
    endDay: string,
    isAttend: string,
    location: string,
    uid: string,
  ) {
    try {
      const arriveCheckCnt = await this.Vote.collection
        .aggregate([
          {
            $match: {
              date: {
                $gte: strToDate(startDay).toDate(),
                $lte: strToDate(endDay).toDate(),
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
              status: '$participations.status',
              date: 1,
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
              name: '$user.name',
              uid: '$user.uid',
              location: '$user.location',
              status: 1,
              date: 1,
            },
          },
          {
            $group: {
              _id: { date: '$date', name: '$name' },
              arrived: { $first: '$arrived' },
              name: { $first: '$name' },
              uid: { $first: '$uid' },
              location: { $first: '$location' },
              status: { $first: '$status' },
              date: { $first: '$date' },
            },
          },
        ])
        .toArray();

      const result = new Map();
      const voteResult = new Map();
      const attendResult = new Map();
      const monthAccResult = new Map();
      const freeAttendResult = new Map();

      arriveCheckCnt.forEach((info: any) => {
        if (uid && uid !== info.uid[0]) return;
        if (info.name[0] && info.location[0] === location) {
          if (info.arrived) {
            if (info.date >= strToDate(startDay).toDate()) {
              if (info.status !== 'free') {
                if (attendResult.has(info.name[0])) {
                  const current = attendResult.get(info.name[0]);
                  attendResult.set(info.name[0], current + 1);
                } else {
                  attendResult.set(info.name[0], 1);
                }
              }
            }
            const cnt = info.status !== 'free' ? 1 : 0.5;
            if (monthAccResult.has(info.name[0])) {
              const current = monthAccResult.get(info.name[0]);
              monthAccResult.set(info.name[0], current + cnt);
            } else {
              monthAccResult.set(info.name[0], cnt);
            }
          }

          if (!isAttend) {
            if (voteResult.has(info.name[0])) {
              const current = voteResult.get(info.name[0]);
              voteResult.set(info.name[0], current + 1);
            } else {
              voteResult.set(info.name[0], 1);
            }
          }
        }
      });
      const allNames = new Set([...voteResult.keys(), ...attendResult.keys()]);

      allNames.forEach((name) => {
        const attendCount = attendResult.get(name) || 0; // attendResult에 값이 없으면 0을 사용
        const voteCount = voteResult.get(name) || 0; // voteResult에 값이 없으면 0을 사용
        const monthAccCount = monthAccResult.get(name) || 0; // monthAccResult에 값이 없으면 0을 사용

        result.set(name, {
          attend: attendCount,
          vote: voteCount,
          monthAcc: monthAccCount,
        });
      });

      return Object.fromEntries(result);
    } catch (err: any) {
      throw new Error(err);
    }
  }
}
