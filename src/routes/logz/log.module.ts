import { ClassProvider, Module } from '@nestjs/common';
import { LogController } from './log.controller';
import LogService from './log.service';
import { MongooseModule } from '@nestjs/mongoose';
import { LogSchema } from './log.entity';
import { ILOG_REPOSITORY } from 'src/utils/di.tokens';
import { MongoLogRepository } from './log.repository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

const logRepositoryProvider: ClassProvider = {
  provide: ILOG_REPOSITORY,
  useClass: MongoLogRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DB_SCHEMA.LOG, schema: LogSchema }]),
  ],
  controllers: [LogController],
  providers: [LogService, logRepositoryProvider],
  exports: [LogService, MongooseModule, logRepositoryProvider],
})
export class LogModule {}
