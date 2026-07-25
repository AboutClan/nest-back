import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  GetMyCouponDto,
  IssueCouponDto,
  RegisterCouponDto,
} from '../../dtos/coupon.dto';
import { CouponService } from '../services/coupon.service';

@ApiTags('coupon')
@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) { }

  /** 제휴처 쿠폰 등록 → couponId + remainingCount 반환 */
  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async register(@Body() dto: RegisterCouponDto, @Res() res: Response) {
    const result = await this.couponService.register(
      dto.partnerId,
      dto.quantity,
      dto.name,
    );
    return res.status(201).json(result);
  }

  /** 전체 쿠폰 리스트 */
  @Get()
  async getAll(@Res() res: Response) {
    const result = await this.couponService.getAll();
    return res.status(200).json(result);
  }

  /** 내가 발급받은 쿠폰 조회 */
  @Get('mine')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getMine(@Query() query: GetMyCouponDto, @Res() res: Response) {
    const result = await this.couponService.getMine(query.couponId);
    return res.status(200).json(result);
  }

  /** name으로 쿠폰 정보 조회 */
  @Get('name/:name')
  async getByName(@Param('name') name: string, @Res() res: Response) {
    const result = await this.couponService.getByName(
      decodeURIComponent(name),
    );
    return res.status(200).json(result);
  }

  /** 쿠폰 정보 조회 (잔여 수량 포함) */
  @Get(':couponId')
  async getCoupon(@Param('couponId') couponId: string, @Res() res: Response) {
    const result = await this.couponService.getCoupon(couponId);
    return res.status(200).json(result);
  }

  /** 사용자 쿠폰 발급 (동일 couponId 1회만) */
  @Post('issue')
  @UsePipes(new ValidationPipe({ transform: true }))
  async issue(@Body() dto: IssueCouponDto, @Res() res: Response) {
    const result = await this.couponService.issue(dto.couponId);
    return res.status(200).json(result);
  }
}
