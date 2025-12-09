import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IGATHERREQUEST_REPOSITORY } from 'src/utils/di.tokens';
import { GatherRequestRepository } from './GatherRequestRepository';
import { GatherRequestController } from './gatherRequest.controller';
import { GatherRequestService } from './gatherRequest.service';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { GatherRequestSchema } from './gatherRequest.entity';

const gatherRequestRepositoryProvider: ClassProvider = {
  provide: IGATHERREQUEST_REPOSITORY,
  useClass: GatherRequestRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.GATHERREQUEST, schema: GatherRequestSchema },
    ]),
  ],
  controllers: [GatherRequestController],
  providers: [GatherRequestService, gatherRequestRepositoryProvider],
  exports: [
    GatherRequestService,
    MongooseModule,
    gatherRequestRepositoryProvider,
  ],
})
export class GatherRequestModule {}
