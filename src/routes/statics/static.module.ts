import { Module } from '@nestjs/common';
import { StaticController } from './static.controller';
import StaticService from './static.service';
import { UserModule } from 'src/routes/user/user.module';
import { LogModule } from 'src/routes/logz/log.module';

@Module({
  imports: [UserModule, LogModule],
  controllers: [StaticController],
  providers: [StaticService],
  exports: [StaticService],
})
export class StaticModule {}
