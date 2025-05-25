import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateQuickVoteDTO {
  @IsString()
  start: string;

  @IsString()
  end: string;

  @IsString()
  @IsOptional() // 선택적 필드로 설정
  memo?: string;
}
