import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { GroupStudyController } from './groupStudy.controller';
import GroupStudyService from './groupStudy.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupStudySchema } from './entity/groupStudy.entity';
import { UserModule } from 'src/user/user.module';
import { CounterModule } from 'src/counter/couter.module';
import { WebPushModule } from 'src/webpush/webpush.module';
import { IGROUPSTUDY_SERVICE } from 'src/utils/di.tokens';

const groupStudyServiceProvider: ClassProvider = {
  provide: IGROUPSTUDY_SERVICE,
  useClass: GroupStudyService,
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
  providers: [groupStudyServiceProvider],
  exports: [groupStudyServiceProvider, MongooseModule],
})
export class GroupStudyModule {}
