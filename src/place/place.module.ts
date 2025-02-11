import { ClassProvider, Module } from '@nestjs/common';
import { PlaceController } from './place.controller';
import PlaceService from './place.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PlaceSchema } from './place.entity';
import { IPLACE_REPOSITORY, IPLACE_SERVICE } from 'src/utils/di.tokens';
import { MongoPlaceReposotory } from './place.repository';

const placeRepositoryProvider: ClassProvider = {
  provide: IPLACE_REPOSITORY,
  useClass: MongoPlaceReposotory,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Place', schema: PlaceSchema }]),
  ],
  controllers: [PlaceController],
  providers: [PlaceService, placeRepositoryProvider],
  exports: [PlaceService, MongooseModule, placeRepositoryProvider],
})
export class PlaceModule {}
