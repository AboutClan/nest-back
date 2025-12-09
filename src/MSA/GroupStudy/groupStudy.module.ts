import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/MSA/User/user.module';
import { CounterModule } from 'src/routes/counter/couter.module';
import { IGROUPSTUDY_REPOSITORY } from 'src/utils/di.tokens';
import { RedisModule } from 'src/redis/redis.module';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { GroupStudyRepository } from './infra/GroupStudyRepository';
import { GroupStudySchema } from './entity/groupStudy.entity';
import { FcmAModule } from '../Notification/fcm.module';
import { CommentModule } from 'src/routes/comment/comment.module';
import { GroupStudyController } from './core/controllers/groupStudy.controller';
import GroupStudyService from './core/services/groupStudy.service';

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
