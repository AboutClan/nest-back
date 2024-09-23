import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';

@Module({
  imports: [],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class AppModule {}
