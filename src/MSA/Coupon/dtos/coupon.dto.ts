import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class RegisterCouponDto {
  @IsNotEmpty({ message: 'partnerId필요' })
  @IsString()
  partnerId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsInt({ message: 'quantity는 정수여야 합니다' })
  @Min(1, { message: 'quantity는 1 이상이어야 합니다' })
  quantity: number;
}

export class IssueCouponDto {
  @IsNotEmpty({ message: 'couponId필요' })
  @IsString()
  couponId: string;
}

export class GetMyCouponDto {
  @IsNotEmpty({ message: 'couponId필요' })
  @IsString()
  couponId: string;
}
