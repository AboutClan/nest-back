import { ClassProvider, Module } from '@nestjs/common';
import { WebPushController } from './webpush.controller';
import { WebPushService } from './webpush.service';
import { UserModule } from 'src/routes/user/user.module';
import { GroupStudyModule } from 'src/routes/groupStudy/groupStudy.module';
import { VoteModule } from 'src/vote/vote.module';
import { IWEBPUSH_REPOSITORY } from 'src/utils/di.tokens';
import { MongoWebpushRepository } from './webpush.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationSubSchema } from './notificationsub.entity';
import { BullModule } from '@nestjs/bull';
import { WebPushConsumer } from './webpush.consumer';
import { GatherSchema } from 'src/routes/gather/gather.entity';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

const webPushRepositoryProvider: ClassProvider = {
  provide: IWEBPUSH_REPOSITORY,
  useClass: MongoWebpushRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.WEBPUSH, schema: NotificationSubSchema },
    ]),
    MongooseModule.forFeature([
      { name: DB_SCHEMA.GATHER, schema: GatherSchema },
    ]),
    BullModule.registerQueue({
      name: 'webpushQ',
      defaultJobOptions: {
        attempts: 2,
        backoff: 3000,
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    }),
    UserModule,
    GroupStudyModule,
    VoteModule,
  ], // Mongoose 모델 등록],
  controllers: [WebPushController],
  providers: [WebPushService, webPushRepositoryProvider, WebPushConsumer],
  exports: [WebPushService, webPushRepositoryProvider],
})
export class WebPushModule {}
