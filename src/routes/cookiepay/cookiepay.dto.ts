import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCookiepayOrderDto {
  @IsNotEmpty({ message: 'orderNo필요' })
  @IsString()
  orderNo: string;

  @IsNotEmpty({ message: 'uid필요' })
  @IsString()
  uid: string;

  @IsIn(['register', 'point'])
  type: 'register' | 'point';

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsString()
  referrerUid?: string;
}

export class MarkCookiepayResultDto {
  @IsNotEmpty({ message: 'orderNo필요' })
  @IsString()
  orderNo: string;

  @IsNumber()
  verifiedAmount: number;

  @IsIn(['SUCCESS', 'FAIL'])
  verifiedStatus: 'SUCCESS' | 'FAIL';
}

export class FinalizeCookiepayOrderDto {
  @IsNotEmpty({ message: 'orderNo필요' })
  @IsString()
  orderNo: string;
}
