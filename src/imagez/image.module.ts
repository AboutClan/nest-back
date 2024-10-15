import { ClassProvider, Module } from '@nestjs/common';
import { ImageController } from './image.controller';
import ImageService from './image.service';
import { IIMAGE_SERVICE } from 'src/utils/di.tokens';

const imageServiceProvider: ClassProvider = {
  provide: IIMAGE_SERVICE,
  useClass: ImageService,
};

@Module({
  imports: [],
  controllers: [ImageController],
  providers: [imageServiceProvider],
  exports: [imageServiceProvider],
})
export class ImageModule {}
