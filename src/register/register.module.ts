import { ClassProvider, Module } from '@nestjs/common';
import { RegisterController } from './register.controller';
import RegisterService from './register.service';
import { MongooseModule } from '@nestjs/mongoose';
import { RegisteredSchema } from './entity/register.entity';
import { UserModule } from 'src/user/user.module';
import { WebPushModule } from 'src/webpush/webpush.module';
import { IREGISTER_REPOSITORY, IREGISTER_SERVICE } from 'src/utils/di.tokens';
import { MongoRegisterRepository } from './register.repository.interface';

const registerServiceProvider: ClassProvider = {
  provide: IREGISTER_SERVICE,
  useClass: RegisterService,
};

const registerRepositoryProvider: ClassProvider = {
  provide: IREGISTER_REPOSITORY,
  useClass: MongoRegisterRepository,
};

@Module({
  imports: [
    UserModule,
    WebPushModule,
    MongooseModule.forFeature([
      { name: 'Registered', schema: RegisteredSchema },
    ]),
  ],
  controllers: [RegisterController],
  providers: [registerServiceProvider, registerRepositoryProvider],
  exports: [
    registerServiceProvider,
    MongooseModule,
    registerRepositoryProvider,
  ],
})
export class RegisterModule {}
