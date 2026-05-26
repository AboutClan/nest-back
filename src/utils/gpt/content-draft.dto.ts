import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GeneratePostDraftDto {
  @IsString()
  @IsNotEmpty({ message: 'text가 필요합니다.' })
  @MaxLength(4000, { message: 'text는 4000자 이하여야 합니다.' })
  text: string;
}

export type PostDraftResult = {
  title: string;
  content: string;
};
