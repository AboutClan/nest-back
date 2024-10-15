import { ClassProvider, Module } from '@nestjs/common';
import { RequestController } from './request.controller';
import RequestService from './request.service';
import { RequestSchema } from './entity/request.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { IREQUEST_SERVICE } from 'src/utils/di.tokens';

const requestServiceProvider: ClassProvider = {
  provide: IREQUEST_SERVICE,
  useClass: RequestService,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Request', schema: RequestSchema }]),
  ],
  controllers: [RequestController],
  providers: [requestServiceProvider],
  exports: [requestServiceProvider, MongooseModule],
})
export class RequestModule {}
