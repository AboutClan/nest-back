import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { GroupStudyController } from './groupStudy.controller';
import GroupStudyService from './groupStudy.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupStudySchema } from './groupStudy.entity';
import { UserModule } from 'src/MSA/User/user.module';
import { CounterModule } from 'src/routes/counter/couter.module';
import { IGROUPSTUDY_REPOSITORY } from 'src/utils/di.tokens';
import { RedisModule } from 'src/redis/redis.module';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../../Notification/fcm/fcm.module';
import { GroupStudyRepository } from './GroupStudyRepository';
import { CommentModule } from '../../../routes/comment/comment.module';

const groupStudyRepositoryProvider: ClassProvider = {
  provide: IGROUPSTUDY_REPOSITORY,
  useClass: GroupStudyRepository,
};

@Module({
  imports: [
    RedisModule,
    UserModule,
    CounterModule,
    MongooseModule.forFeature([
      { name: DB_SCHEMA.GROUPSTUDY, schema: GroupStudySchema },
    ]),
    FcmAModule,
    CommentModule,
  ],
  controllers: [GroupStudyController],
  providers: [GroupStudyService, groupStudyRepositoryProvider],
  exports: [GroupStudyService, MongooseModule, groupStudyRepositoryProvider],
})
export class GroupStudyModule {}
