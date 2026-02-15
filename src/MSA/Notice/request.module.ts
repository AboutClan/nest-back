import { ClassProvider, Module } from '@nestjs/common';
import RequestService from './core/services/request.service';
import { RequestSchema } from './entity/request.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { IREQUEST_REPOSITORY } from 'src/utils/di.tokens';
import { MongoRequestRepository } from './infra/MongoRequestRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { RequestController } from './core/controllers/request.controller';

const requestRepositoryProvider: ClassProvider = {
  provide: IREQUEST_REPOSITORY,
  useClass: MongoRequestRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.REQUEST, schema: RequestSchema },
    ]),
  ],
  controllers: [RequestController],
  providers: [RequestService, requestRepositoryProvider],
  exports: [RequestService, MongooseModule, requestRepositoryProvider],
})
export class RequestModule { }
