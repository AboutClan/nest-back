import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ICouponRepository } from '../core/interfaces/CouponRepository.interface';
import { ICoupon } from '../entity/coupon.entity';
import { ICouponIssue } from '../entity/couponIssue.entity';

export class MongoCouponRepository implements ICouponRepository {
  constructor(
    @InjectModel(DB_SCHEMA.COUPON)
    private readonly Coupon: Model<ICoupon>,
    @InjectModel(DB_SCHEMA.COUPON_ISSUE)
    private readonly CouponIssue: Model<ICouponIssue>,
  ) {}

  async createCoupon(params: {
    partnerId: string;
    code: string;
    name?: string;
    quantity: number;
  }): Promise<ICoupon> {
    const coupon = await this.Coupon.create({
      partnerId: params.partnerId,
      code: params.code,
      name: params.name,
      totalCount: params.quantity,
      remainingCount: params.quantity,
    });
    return coupon.toObject();
  }

  async createCoupons(
    params: {
      partnerId: string;
      code: string;
      name?: string;
      quantity: number;
    }[],
  ): Promise<ICoupon[]> {
    const docs = await this.Coupon.insertMany(
      params.map((param) => ({
        partnerId: param.partnerId,
        code: param.code,
        name: param.name,
        totalCount: param.quantity,
        remainingCount: param.quantity,
      })),
    );
    return docs.map((doc) => doc.toObject());
  }

  async findById(couponId: string): Promise<ICoupon | null> {
    if (!Types.ObjectId.isValid(couponId)) return null;
    return this.Coupon.findById(couponId).lean();
  }

  async findAll(): Promise<ICoupon[]> {
    return this.Coupon.find().sort({ createdAt: -1 }).lean();
  }

  async findByName(name: string): Promise<ICoupon | null> {
    return this.Coupon.findOne({ name }).lean();
  }

  async findIdsByPartnerId(partnerId: string): Promise<Types.ObjectId[]> {
    const coupons = await this.Coupon.find({ partnerId }, { _id: 1 }).lean();
    return coupons.map((coupon) => coupon._id as Types.ObjectId);
  }

  async findIssued(
    couponId: string,
    userId: string,
  ): Promise<ICouponIssue | null> {
    if (!Types.ObjectId.isValid(couponId)) return null;
    return this.CouponIssue.findOne({
      couponId: new Types.ObjectId(couponId),
      userId,
    }).lean();
  }

  async findIssuedAmong(
    couponIds: Types.ObjectId[],
    userId: string,
  ): Promise<ICouponIssue | null> {
    if (!couponIds.length) return null;
    return this.CouponIssue.findOne({
      couponId: { $in: couponIds },
      userId,
    }).lean();
  }

  async claimRemaining(couponId: string): Promise<ICoupon | null> {
    if (!Types.ObjectId.isValid(couponId)) return null;
    return this.Coupon.findOneAndUpdate(
      {
        _id: new Types.ObjectId(couponId),
        remainingCount: { $gt: 0 },
      },
      { $inc: { remainingCount: -1 } },
      { new: true },
    ).lean();
  }

  async claimRemainingByPartnerId(partnerId: string): Promise<ICoupon | null> {
    return this.Coupon.findOneAndUpdate(
      {
        partnerId,
        remainingCount: { $gt: 0 },
      },
      { $inc: { remainingCount: -1 } },
      { new: true },
    ).lean();
  }

  async restoreRemaining(couponId: string): Promise<void> {
    if (!Types.ObjectId.isValid(couponId)) return;
    await this.Coupon.updateOne(
      { _id: new Types.ObjectId(couponId) },
      { $inc: { remainingCount: 1 } },
    );
  }

  async createIssue(couponId: string, userId: string): Promise<ICouponIssue> {
    const issue = await this.CouponIssue.create({
      couponId: new Types.ObjectId(couponId),
      userId,
      issuedAt: new Date(),
    });
    return issue.toObject();
  }
}
