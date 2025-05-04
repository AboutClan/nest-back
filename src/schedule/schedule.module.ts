import { Module } from '@nestjs/common';
import { NotificationScheduler } from './schedule';
import { GatherModule } from 'src/routes/gather/gather.module';
import { GroupStudyModule } from 'src/routes/groupStudy/groupStudy.module';
import { UserModule } from 'src/routes/user/user.module';
import { Vote2Module } from 'src/routes/vote2/vote2.module';

@Module({
  imports: [GatherModule, GroupStudyModule, UserModule, Vote2Module],
  controllers: [],
  providers: [NotificationScheduler],
  exports: [NotificationScheduler],
})
export class SchedulerModule {}
