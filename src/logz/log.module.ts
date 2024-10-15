import { ClassProvider, Module } from '@nestjs/common';
import { LogController } from './log.controller';
import LogService from './log.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Log, LogSchema } from './entity/log.entity';
import { ILOG_SERVICE } from 'src/utils/di.tokens';

const logServiceProvider: ClassProvider = {
  provide: ILOG_SERVICE,
  useClass: LogService,
};

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Log', schema: LogSchema }])],
  controllers: [LogController],
  providers: [logServiceProvider],
  exports: [logServiceProvider, MongooseModule],
})
export class LogModule {}
