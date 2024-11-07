import { ClassProvider, Module } from '@nestjs/common';
import { LogController } from './log.controller';
import LogService from './log.service';
import { MongooseModule } from '@nestjs/mongoose';
import { LogSchema } from './entity/log.entity';
import { ILOG_REPOSITORY, ILOG_SERVICE } from 'src/utils/di.tokens';
import { MongoLogRepository } from './log.repository';

const logServiceProvider: ClassProvider = {
  provide: ILOG_SERVICE,
  useClass: LogService,
};

const logRepositoryProvider: ClassProvider = {
  provide: ILOG_REPOSITORY,
  useClass: MongoLogRepository,
};

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Log', schema: LogSchema }])],
  controllers: [LogController],
  providers: [logServiceProvider, logRepositoryProvider],
  exports: [logServiceProvider, MongooseModule, logRepositoryProvider],
})
export class LogModule {}
