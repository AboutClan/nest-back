import { ClassProvider, Module } from '@nestjs/common';
import { SquareController } from './square.controller';
import SquareService from './square.service';
import ImageService from 'src/imagez/image.service';
import { MongooseModule } from '@nestjs/mongoose';
import { secretSquareSchema } from './entity/square.entity';
import { ISQUARE_SERVICE } from 'src/utils/di.tokens';

const squareServiceProvider: ClassProvider = {
  provide: ISQUARE_SERVICE,
  useClass: SquareService,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'SecretSquare', schema: secretSquareSchema },
    ]),
  ],
  controllers: [SquareController],
  providers: [squareServiceProvider, ImageService],
  exports: [squareServiceProvider, MongooseModule],
})
export class SquareModule {}
