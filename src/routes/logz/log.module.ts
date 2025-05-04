import { ClassProvider, Module } from '@nestjs/common';
import { LogController } from './log.controller';
import LogService from './log.service';
import { MongooseModule } from '@nestjs/mongoose';
import { LogSchema } from './log.entity';
import { ILOG_REPOSITORY } from 'src/utils/di.tokens';
import { MongoLogRepository } from './log.repository';

const logRepositoryProvider: ClassProvider = {
  provide: ILOG_REPOSITORY,
  useClass: MongoLogRepository,
};

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Log', schema: LogSchema }])],
  controllers: [LogController],
  providers: [LogService, logRepositoryProvider],
  exports: [LogService, MongooseModule, logRepositoryProvider],
})
export class LogModule {}
