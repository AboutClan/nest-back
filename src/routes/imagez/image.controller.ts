import {
  Controller,
  Post,
  UploadedFile,
  Body,
  HttpException,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import ImageService from './image.service';

@Controller('image')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('path') path: string,
  ) {
    if (!file || !file.buffer) {
      throw new HttpException('Invalid image file', HttpStatus.BAD_REQUEST);
    }

    try {
      const location = await this.imageService.uploadSingleImage(
        path,
        file.buffer,
      );
      return {
        ok: true,
        message: 'Image uploaded successfully',
        data: { location },
      };
    } catch (err) {
      throw new HttpException('Error uploading image', HttpStatus.BAD_REQUEST);
    }
  }
}
