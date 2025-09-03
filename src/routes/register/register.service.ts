import { HttpException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as CryptoJS from 'crypto-js';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { ValidationError } from 'src/errors/ValidationError';
import { RequestContext } from 'src/request-context';
import { IAccount } from 'src/routes/account/account.entity';
import { IUser } from 'src/routes/user/user.entity';
import { WebPushService } from 'src/routes/webpush/webpush.service';
import { DateUtils } from 'src/utils/Date';
import { IREGISTER_REPOSITORY } from 'src/utils/di.tokens';
import * as logger from '../../logger';
import { IRegistered } from './register.entity';
import { RegisterRepository } from './register.repository';

export default class RegisterService {
  constructor(
    @Inject(IREGISTER_REPOSITORY)
    private readonly registerRepository: RegisterRepository,
    @InjectModel(DB_SCHEMA.USER) private User: Model<IUser>,
    @InjectModel(DB_SCHEMA.ACCOUNT) private Account: Model<IAccount>,
    private readonly webPushServiceInstance: WebPushService,
  ) {}

  async encodeByAES56(tel: string) {
    const key = process.env.cryptoKey;
    if (!key) return tel;

    return CryptoJS.AES.encrypt(tel, key).toString();
  }

  async decodeByAES256(encodedTel: string) {
    const key = process.env.cryptoKey;
    if (!key) return encodedTel;

    const bytes = CryptoJS.AES.decrypt(encodedTel, key);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
  }

  async register(subRegisterForm: Omit<IRegistered, 'uid' | 'profileImage'>) {
    try {
      const token = RequestContext.getDecodedToken();
      const { telephone } = subRegisterForm;

      // 전화번호 검증: 010으로 시작하고 11자리 숫자인지 확인
      const telephoneRegex = /^010-\d{4}-\d{4}$/;
      if (!telephoneRegex.test(telephone)) {
        throw new Error('Invalid telephone number');
      }

      const encodedTel = await this.encodeByAES56(telephone);
      if (encodedTel === telephone) throw new Error('Key not exist');
      if (encodedTel.length == 0) throw new Error('Key not exist');

      await this.registerRepository.updateByUid(token.uid, {
        ...subRegisterForm,
        role: 'waiting',
        telephone: encodedTel,
      });

      // await this.webPushServiceInstance.sendNotificationToManager(
      //   subRegisterForm.location,
      // );
      return;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, 500);
    }
  }

  async removeUnnecessaryUserField() {
    await this.User.updateMany(
      {},
      {
        $unset: {
          email: '',
          emailVerified: '',
          kakao_account: '',
          properties: '',
          connected_at: '',
        },
      },
      { strict: false },
    );
  }

  async approve(uid: string) {
    let userForm;

    const user = await this.registerRepository.findByUid(uid);
    if (!user) throw new ValidationError('wrong uid');

    userForm = {
      ...user.toObject(),
      role: 'human',
      registerDate: DateUtils.getTodayYYYYMMDD(),
      isActive: true,
      point: 10000,
      ticket: {
        gatherTicket: ENTITY.USER.DEFAULT_GATHER_TICKET,
        groupStudyTicket: ENTITY.USER.DEFAULT_GROUPSTUDY_TICKET,
      },
    };

    try {
      const A = await this.User.findOneAndUpdate({ uid }, userForm, {
        upsert: true,
        new: true,
      });

      await this.removeUnnecessaryUserField();

      await this.deleteRegisterUser(uid, true);
    } catch (err: any) {
      throw new Error(err);
    }

    logger.logger.info('가입 보증금', {
      type: 'point',
      uid,
      value: 10000,
    });
    return;
  }

  async deleteRegisterUser(uid: string, approve: boolean) {
    if (!approve) {
      await this.User.deleteOne({ uid });
      await this.Account.deleteOne({ providerAccountId: uid });
    }
    await this.registerRepository.deleteByUid(uid);
  }

  async getRegister() {
    const users = await this.registerRepository.findAll();

    users.forEach(async (user) => {
      user.telephone = await this.decodeByAES256(user.telephone);
    });

    // const a = await this.Account.aggregate([
    //   {
    //     $group: {
    //       _id: '$providerAccountId',
    //       count: { $sum: 1 },
    //       docs: { $push: '$$ROOT' }, // 중복된 문서들을 저장
    //     },
    //   },
    //   {
    //     $match: {
    //       count: { $gt: 1 }, // 2개 이상 존재하는 경우
    //     },
    //   },
    // ]);

    // console.log(a);

    return users;
  }
}
