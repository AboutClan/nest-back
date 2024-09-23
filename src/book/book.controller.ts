import { Controller } from '@nestjs/common';
import { BookService } from './book.service';

@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Get()
  async getBookList() {
    try {
      const bookList = await this.bookService.getBookList();
      return bookList;
  }
}
