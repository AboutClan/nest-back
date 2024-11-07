import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { GroupStudyController } from './groupStudy.controller';
import GroupStudyService from './groupStudy.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupStudySchema } from './entity/groupStudy.entity';
import { UserModule } from 'src/user/user.module';
import { CounterModule } from 'src/counter/couter.module';
import { WebPushModule } from 'src/webpush/webpush.module';
import {
  IGROUPSTUDY_REPOSITORY,
  IGROUPSTUDY_SERVICE,
} from 'src/utils/di.tokens';
import { MongoGroupStudyInterface } from './groupStudy.repository';

const groupStudyServiceProvider: ClassProvider = {
  provide: IGROUPSTUDY_SERVICE,
  useClass: GroupStudyService,
};

const groupStudyRepositoryProvider: ClassProvider = {
  provide: IGROUPSTUDY_REPOSITORY,
  useClass: MongoGroupStudyInterface,
};

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
  providers: [groupStudyServiceProvider, groupStudyRepositoryProvider],
  exports: [
    groupStudyServiceProvider,
    MongooseModule,
    groupStudyRepositoryProvider,
  ],
})
export class GroupStudyModule {}
