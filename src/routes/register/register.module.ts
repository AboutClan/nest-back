import { ClassProvider, Module } from '@nestjs/common';
import { RegisterController } from './register.controller';
import RegisterService from './register.service';
import { MongooseModule } from '@nestjs/mongoose';
import { RegisteredSchema } from './register.entity';
import { UserModule } from 'src/MSA/User/user/user.module';
import { WebPushModule } from 'src/routes/webpush/webpush.module';
import { IREGISTER_REPOSITORY, IREGISTER_SERVICE } from 'src/utils/di.tokens';
import { MongoRegisterRepository } from './register.repository.interface';
import { AccountModule } from 'src/routes/account/account.module';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

const registerRepositoryProvider: ClassProvider = {
  provide: IREGISTER_REPOSITORY,
  useClass: MongoRegisterRepository,
};

@Module({
  imports: [
    UserModule,
    WebPushModule,
    MongooseModule.forFeature([
      { name: DB_SCHEMA.REGISTER, schema: RegisteredSchema },
    ]),
    AccountModule,
  ],
  controllers: [RegisterController],
  providers: [RegisterService, registerRepositoryProvider],
  exports: [RegisterService, MongooseModule, registerRepositoryProvider],
})
export class RegisterModule {}
