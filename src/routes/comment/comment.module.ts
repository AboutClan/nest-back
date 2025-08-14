import { ClassProvider, Module } from '@nestjs/common';
import { CommentRepository } from './CommentRepository';
import CommentService from './comment.service';
import { ICOMMENT_REPOSITORY } from 'src/utils/di.tokens';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { MongooseModule } from '@nestjs/mongoose';
import { commentSchema } from './comment.entity';

const commentRepositoryProvider: ClassProvider = {
  provide: ICOMMENT_REPOSITORY,
  useClass: CommentRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.COMMENT, schema: commentSchema },
    ]),
  ],
  providers: [commentRepositoryProvider, CommentService],
  exports: [CommentService, commentRepositoryProvider],
})
export class CommentModule {}
