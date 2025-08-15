import { Module } from '@nestjs/common';
import { NotificationScheduler } from './schedule';
import { GatherModule } from 'src/routes/gather/gather.module';
import { GroupStudyModule } from 'src/routes/groupStudy/groupStudy.module';
import { UserModule } from 'src/routes/user/user.module';
import { Vote2Module } from 'src/routes/vote2/vote2.module';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ScheduleLogSchema } from './schedule_log.entity';
import { BackupModule } from 'src/Database/backup.module';

const isDev = process.env.NODE_ENV === 'development';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.SCHEDULE_LOG, schema: ScheduleLogSchema },
    ]),
    GatherModule,
    GroupStudyModule,
    UserModule,
    Vote2Module,
    BackupModule,
  ],
  controllers: [],
  providers: [...(!isDev ? [NotificationScheduler] : [])],
  exports: [...(!isDev ? [NotificationScheduler] : [])],
})
export class SchedulerModule {}
