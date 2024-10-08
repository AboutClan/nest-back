import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Log, LogSchema } from 'src/logz/entity/log.entity';
import { StaticController } from './static.controller';
import StaticService from './static.service';
import { User, UserSchema } from 'src/user/entity/user.entity';
import { UserModule } from 'src/user/user.module';
import { LogModule } from 'src/logz/log.module';

@Module({
  imports: [UserModule, LogModule],
  controllers: [StaticController],
  providers: [StaticService],
  exports: [StaticService],
})
export class StaticModule {}
