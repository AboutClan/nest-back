import { Module } from '@nestjs/common';
import { SquareController } from './square.controller';
import SquareService from './square.service';
import ImageService from 'src/imagez/image.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SecretSquare, secretSquareSchema } from './entity/square.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SecretSquare.name, schema: secretSquareSchema },
    ]),
  ],
  controllers: [SquareController],
  providers: [SquareService, ImageService],
  exports: [SquareService],
})
export class SquareModule {}
