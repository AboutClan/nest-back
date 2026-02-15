import { ClassProvider, Module } from '@nestjs/common';
import { RegisterController } from './core/controllers/register.controller';

import { MongooseModule } from '@nestjs/mongoose';
import { RegisteredSchema } from './entity/register.entity';
import { UserModule } from 'src/MSA/User/user.module';
import { IREGISTER_REPOSITORY } from 'src/utils/di.tokens';
import { MongoRegisterRepository } from './core/interfaces/register.repository.interface';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { AccountModule } from 'src/MSA/User/account.module';
import RegisterService from './core/services/register.service';

const registerRepositoryProvider: ClassProvider = {
  provide: IREGISTER_REPOSITORY,
  useClass: MongoRegisterRepository,
};

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: DB_SCHEMA.REGISTER, schema: RegisteredSchema },
    ]),
    AccountModule,
  ],
  controllers: [RegisterController],
  providers: [RegisterService, registerRepositoryProvider],
  exports: [RegisterService, MongooseModule, registerRepositoryProvider],
})
export class RegisterModule { }
