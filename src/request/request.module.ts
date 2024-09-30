import { Module } from '@nestjs/common';
import { RequestController } from './request.controller';
import RequestService from './request.service';
import { Request, RequestSchema } from './entity/request.entity';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Request.name, schema: RequestSchema }]),
  ],
  controllers: [RequestController],
  providers: [RequestService],
  exports: [RequestService],
})
export class RequestModule {}
