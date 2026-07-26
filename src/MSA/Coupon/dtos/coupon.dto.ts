import {
  ArrayNotEmpty,
  IsArray,
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

  @IsNotEmpty({ message: 'code필요' })
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsInt({ message: 'quantity는 정수여야 합니다' })
  @Min(1, { message: 'quantity는 1 이상이어야 합니다' })
  quantity: number;
}

export class RegisterCouponBulkDto {
  @IsNotEmpty({ message: 'partnerId필요' })
  @IsString()
  partnerId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'codes필요' })
  @IsString({ each: true })
  codes: string[];
}

export class IssueCouponDto {
  @IsNotEmpty({ message: 'couponId필요' })
  @IsString()
  couponId: string;
}

export class IssueCouponByPartnerDto {
  @IsNotEmpty({ message: 'partnerId필요' })
  @IsString()
  partnerId: string;
}

export class GetMyCouponDto {
  @IsNotEmpty({ message: 'couponId필요' })
  @IsString()
  couponId: string;
}
