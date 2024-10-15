import { ClassProvider, Module } from '@nestjs/common';
import { WebPushController } from './webpush.controller';
import { WebPushService } from './webpush.service';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationSubSchema } from './entity/notificationsub.entity';
import { UserModule } from 'src/user/user.module';
import { GroupStudyModule } from 'src/groupStudy/groupStudy.module';
import { VoteModule } from 'src/vote/vote.module';
import { IWEBPUSH_SERVICE } from 'src/utils/di.tokens';

const webPushServiceProvider: ClassProvider = {
  provide: IWEBPUSH_SERVICE,
  useClass: WebPushService,
};

@Module({
  imports: [
    UserModule,
    GroupStudyModule,
    VoteModule,
    MongooseModule.forFeature([
      { name: 'NotificationSub', schema: NotificationSubSchema },
    ]),
  ],
  controllers: [WebPushController],
  providers: [webPushServiceProvider],
  exports: [webPushServiceProvider, MongooseModule],
})
export class WebPushModule {}
