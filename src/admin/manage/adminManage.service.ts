//전자는 스터디 참여에 투표를 해 놓고 OPEN도 되어 있어서 와야만 하는 상황에서,
//출석체크도 안하고, 불참버튼도 안 누른 인원(말 그대로 잠수한 인원)을 체크해서 보증금에서 -1000원을 하면 되는거예요!

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { DatabaseError } from 'src/errors/DatabaseError';
import { IUser } from 'src/routes/user/user.entity';
import { UserService } from 'src/routes/user/user.service';
import { DateUtils } from 'src/utils/Date';
import { VoteService } from 'src/vote/vote.service';
const logger = require('../../logger');

export default class AdminManageService {
  constructor(
    private readonly userServiceInstance: UserService,
    private readonly voteServiceInstance: VoteService,
    @InjectModel(DB_SCHEMA.USER) private User: Model<IUser>,
  ) {}

  async absenceManage() {
    const date = DateUtils.strToDate(DateUtils.getTodayYYYYMMDD().toString());

    const vote = await this.voteServiceInstance.getVote(date);
    if (!vote) throw new DatabaseError('Vote date Error');

    const unUser: any[] = [];

    vote.participations.forEach((participation) => {
      if (participation.status === 'open') {
        participation.attendences?.forEach((attendence) => {
          if (
            !attendence['arrived'] &&
            !participation.absences?.some(
              (user) =>
                (attendence.user as IUser).uid == (user.user as IUser).uid,
            )
          ) {
            unUser.push((attendence.user as IUser).uid);
          }
        });
      }
    });
  }
}
