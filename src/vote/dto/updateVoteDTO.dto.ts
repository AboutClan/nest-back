import { IsString, IsDateString, IsOptional } from 'class-validator';

export class UpdateVoteDTO {
  @IsString()
  start: string;

  @IsString()
  end: string;
}
