import { ClassProvider, Module } from '@nestjs/common';
import { PlaceController } from './place.controller';
import PlaceService from './place.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PlaceSchema } from './entity/place.entity';
import { IPLACE_SERVICE } from 'src/utils/di.tokens';

const placeServiceProvider: ClassProvider = {
  provide: IPLACE_SERVICE,
  useClass: PlaceService,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Place', schema: PlaceSchema }]),
  ],
  controllers: [PlaceController],
  providers: [placeServiceProvider],
  exports: [placeServiceProvider, MongooseModule],
})
export class PlaceModule {}
