import { Module } from '@nestjs/common';
import { AdminUserController } from './adminUser.controller';
import AdminUserService from './adminUser.service';
import { UserModule } from 'src/MSA/User/user.module';

@Module({
  imports: [UserModule],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
