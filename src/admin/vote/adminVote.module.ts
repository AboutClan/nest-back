import { Module } from '@nestjs/common';
import { AdminVoteController } from './adminVote.controller';
import { VoteModule } from 'src/vote/vote.module';
import AdminVoteService from './adminVote.service';

@Module({
  imports: [VoteModule],
  controllers: [AdminVoteController],
  providers: [AdminVoteService],
  exports: [AdminVoteService],
})
export class AdminVoteModule {}
