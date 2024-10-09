import { Module } from '@nestjs/common';
import { RegisterController } from './register.controller';
import RegisterService from './register.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entity/user.entity';
import { WebPushService } from 'src/webpush/webpush.service';
import { Registered, RegisteredSchema } from './entity/register.entity';
import { UserModule } from 'src/user/user.module';
import { WebPushModule } from 'src/webpush/webpush.module';

@Module({
  imports: [
    UserModule,
    WebPushModule,
    MongooseModule.forFeature([
      { name: 'Registered', schema: RegisteredSchema },
    ]),
  ],
  controllers: [RegisterController],
  providers: [RegisterService],
  exports: [RegisterService, MongooseModule],
})
export class RegisterModule {}
