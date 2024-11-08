import { IsString } from 'class-validator';

export class CreateChatDTO {
  @IsString()
  toUid: string;
  @IsString()
  message: string;
}

export class GetChatDTO {
  @IsString()
  toUid: string;
}
