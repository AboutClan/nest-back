import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { GroupStudyController } from './groupStudy.controller';
import GroupStudyService from './groupStudy.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupStudySchema } from './groupStudy.entity';
import { UserModule } from 'src/user/user.module';
import { CounterModule } from 'src/counter/couter.module';
import { WebPushModule } from 'src/webpush/webpush.module';
import { IGROUPSTUDY_REPOSITORY } from 'src/utils/di.tokens';
import { MongoGroupStudyInterface } from './groupStudy.repository';
import { RedisModule } from 'src/redis/redis.module';

const groupStudyRepositoryProvider: ClassProvider = {
  provide: IGROUPSTUDY_REPOSITORY,
  useClass: MongoGroupStudyInterface,
};

@Module({
  imports: [
    RedisModule,
    UserModule,
    CounterModule,
    forwardRef(() => WebPushModule),
    MongooseModule.forFeature([
      { name: 'GroupStudy', schema: GroupStudySchema },
    ]),
  ],
  controllers: [GroupStudyController],
  providers: [GroupStudyService, groupStudyRepositoryProvider],
  exports: [GroupStudyService, MongooseModule, groupStudyRepositoryProvider],
})
export class GroupStudyModule {}
