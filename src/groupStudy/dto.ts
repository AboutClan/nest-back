import { IsNotEmpty, IsNumber } from 'class-validator';

// DTOs for request validation
export class SetGiftDto {
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @IsNotEmpty({ message: 'cnt is required' })
  @IsNumber()
  cnt: number;

  @IsNotEmpty({ message: 'giftId is required' })
  @IsNumber()
  giftId: number;
}
