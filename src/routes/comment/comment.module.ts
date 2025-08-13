import { Module } from '@nestjs/common';
import { CommentRepository } from './CommentRepository';
import CommentService from './comment.service';

@Module({
  providers: [CommentService, CommentRepository],
  exports: [CommentService],
})
export class CommentModule {}
