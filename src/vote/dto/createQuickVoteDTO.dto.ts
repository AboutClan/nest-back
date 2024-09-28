import { IsString, IsDateString, IsOptional } from 'class-validator';
import { Dayjs } from 'dayjs';

export class CreateQuickVoteDTO {
  @IsString()
  start: Dayjs;

  @IsString()
  end: Dayjs;

  @IsString()
  @IsOptional() // 선택적 필드로 설정
  memo?: string;
}
