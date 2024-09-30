import { Module } from '@nestjs/common';
import { GroupStudyController } from './groupStudy.controller';
import GroupStudyService from './groupStudy.service';
import { User, UserSchema } from 'src/user/entity/user.entity';
import { Counter, CounterSchema } from 'src/counter/entity/counter.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { WebPushService } from 'src/webpush/webpush.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Counter.name, schema: CounterSchema }]),
  ],
  controllers: [GroupStudyController],
  providers: [GroupStudyService, WebPushService],
  exports: [GroupStudyService],
})
export class GroupStudyModule {}
