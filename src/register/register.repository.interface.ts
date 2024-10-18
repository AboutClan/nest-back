import { InjectModel } from '@nestjs/mongoose';
import { RegisterRepository } from './register.repository';
import { Model } from 'mongoose';
import { IRegistered } from './entity/register.entity';

export class MongoRegisterRepository implements RegisterRepository {
  constructor(
    @InjectModel('Register')
    private readonly Register: Model<IRegistered>,
  ) {}
}
