import { Module } from '@nestjs/common';
import { RegisterController } from './register.controller';
import RegisterService from './register.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entity/user.entity';
import { WebPushService } from 'src/webpush/webpush.service';
import { Registered, RegisteredSchema } from './entity/register.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: Registered.name, schema: RegisteredSchema },
    ]),
  ],
  controllers: [RegisterController],
  providers: [RegisterService, WebPushService],
  exports: [RegisterService, MongooseModule],
})
export class RegisterModule {}
