import { IsObject, IsString } from 'class-validator';

export class createSubDTO {
  @IsString()
  endPoint: string;

  @IsObject()
  keys: {
    p256dh: string;
    auth: string;
  };
}
