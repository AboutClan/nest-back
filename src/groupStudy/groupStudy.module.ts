import { Module } from '@nestjs/common';
import { GroupStudyController } from './groupStudy.controller';
import GroupStudyService from './groupStudy.service';
import { User, UserSchema } from 'src/user/entity/user.entity';
import { Counter, CounterSchema } from 'src/counter/entity/counter.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { WebPushService } from 'src/webpush/webpush.service';
import { GroupStudy, GroupStudySchema } from './entity/groupStudy.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GroupStudy.name, schema: GroupStudySchema },
    ]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Counter.name, schema: CounterSchema }]),
  ],
  controllers: [GroupStudyController],
  providers: [GroupStudyService, WebPushService],
  exports: [GroupStudyService],
})
export class GroupStudyModule {}
