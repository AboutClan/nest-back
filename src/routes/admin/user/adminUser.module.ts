import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminUserController } from './adminUser.controller';
import AdminUserService from './adminUser.service';
import { UserModule } from 'src/MSA/User/user.module';
import { GroupStudyModule } from 'src/MSA/GroupStudy/groupStudy.module';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { GroupStudySchema } from 'src/MSA/GroupStudy/entity/groupStudy.entity';
import { LogSchema } from 'src/routes/logz/log.entity';

@Module({
  imports: [
    UserModule,
    GroupStudyModule,
    MongooseModule.forFeature([
      { name: DB_SCHEMA.GROUPSTUDY, schema: GroupStudySchema },
      { name: DB_SCHEMA.LOG, schema: LogSchema },
    ]),
  ],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
