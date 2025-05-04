import { InjectModel } from '@nestjs/mongoose';
import { RegisterRepository } from './register.repository';
import { Model } from 'mongoose';
import { IRegistered } from './register.entity';

export class MongoRegisterRepository implements RegisterRepository {
  constructor(
    @InjectModel('Registered')
    private readonly Registered: Model<IRegistered>,
  ) {}
  async updateByUid(uid: string, data: any): Promise<null> {
    await this.Registered.findOneAndUpdate({ uid }, data, {
      upsert: true,
      new: true,
    });
    return null;
  }
  async findByUid(uid: string): Promise<IRegistered> {
    return await this.Registered.findOne({ uid }, '-_id -__v');
  }
  async deleteByUidWithSession(uid: string, session: any): Promise<null> {
    await this.Registered.deleteOne({ uid }).session(session);
    return null;
  }
  async deleteByUid(uid: string): Promise<null> {
    await this.Registered.deleteOne({ uid });
    return null;
  }
  async findAll(): Promise<IRegistered[]> {
    return await this.Registered.find({});
  }
}
