import { forwardRef, Module } from '@nestjs/common';
import { GroupStudyController } from './groupStudy.controller';
import GroupStudyService from './groupStudy.service';
import { MongooseModule } from '@nestjs/mongoose';
import { WebPushService } from 'src/webpush/webpush.service';
import { GroupStudySchema } from './entity/groupStudy.entity';
import { UserModule } from 'src/user/user.module';
import { CounterModule } from 'src/counter/couter.module';
import { WebPushModule } from 'src/webpush/webpush.module';

@Module({
  imports: [
    UserModule,
    CounterModule,
    forwardRef(() => WebPushModule),
    MongooseModule.forFeature([
      { name: 'GroupStudy', schema: GroupStudySchema },
    ]),
  ],
  controllers: [GroupStudyController],
  providers: [GroupStudyService],
  exports: [GroupStudyService, MongooseModule],
})
export class GroupStudyModule {}
