import { MiddlewareConsumer, Module } from '@nestjs/common';
import { BookController } from './book.controller';
import { BookService } from './book.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entity/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [BookController],
  providers: [BookService],
  exports: [BookService],
})
export class BookModule {}
