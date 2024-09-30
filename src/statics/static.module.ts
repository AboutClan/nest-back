import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Log, LogSchema } from 'src/logz/entity/log.entity';
import { StaticController } from './static.controller';
import StaticService from './static.service';
import { User, UserSchema } from 'src/user/entity/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]),
  ],
  controllers: [StaticController],
  providers: [StaticService],
  exports: [StaticService],
})
export class StaticModule {}
