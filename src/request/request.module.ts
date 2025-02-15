import { ClassProvider, Module } from '@nestjs/common';
import { RequestController } from './request.controller';
import RequestService from './request.service';
import { RequestSchema } from './request.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { IREQUEST_REPOSITORY } from 'src/utils/di.tokens';
import { MongoRequestRepository } from './request.repository';

const requestRepositoryProvider: ClassProvider = {
  provide: IREQUEST_REPOSITORY,
  useClass: MongoRequestRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Request', schema: RequestSchema }]),
  ],
  controllers: [RequestController],
  providers: [RequestService, requestRepositoryProvider],
  exports: [RequestService, MongooseModule, requestRepositoryProvider],
})
export class RequestModule {}
