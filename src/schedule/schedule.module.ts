import { Module } from '@nestjs/common';
import { NotificationScheduler } from './schedule';
import { GatherModule } from 'src/gather/gather.module';
import { GroupStudyModule } from 'src/groupStudy/groupStudy.module';
import { UserModule } from 'src/user/user.module';
import { Vote2Module } from 'src/vote2/vote2.module';

@Module({
  imports: [GatherModule, GroupStudyModule, UserModule, Vote2Module],
  controllers: [],
  providers: [NotificationScheduler],
  exports: [NotificationScheduler],
})
export class SchedulerModule {}
