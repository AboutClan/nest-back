import { Module } from '@nestjs/common';
import { PlaceController } from './place.controller';
import PlaceService from './place.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Place, PlaceSchema } from './entity/place.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Place.name, schema: PlaceSchema }]),
  ],
  controllers: [PlaceController],
  providers: [PlaceService],
  exports: [PlaceService],
})
export class PlaceModule {}
