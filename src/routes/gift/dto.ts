import { Controller } from '@nestjs/common';
import { IsNotEmpty, IsNumber } from 'class-validator';

// DTOs for request validation
export class SetGiftDto {
  @IsNotEmpty({ message: 'name필요' })
  name: string;

  @IsNotEmpty({ message: 'cnt필요' })
  @IsNumber()
  cnt: number;

  @IsNotEmpty({ message: 'giftId필요' })
  @IsNumber()
  giftId: number;
}
