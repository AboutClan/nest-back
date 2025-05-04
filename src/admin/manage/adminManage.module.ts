import { Module } from '@nestjs/common';
import { AdminManageController } from './adminManage.controller';
import AdminManageService from './adminManage.service';
import { VoteModule } from 'src/vote/vote.module';
import { UserModule } from 'src/routes/user/user.module';

@Module({
  imports: [VoteModule, UserModule],
  controllers: [AdminManageController],
  providers: [AdminManageService],
  exports: [AdminManageService],
})
export class AdminManageModule {}
