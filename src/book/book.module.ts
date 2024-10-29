import { Module } from '@nestjs/common';
import { BookController } from './book.controller';
import { BookService } from './book.service';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [BookController],
  providers: [BookService],
  exports: [BookService],
})
export class BookModule {}
