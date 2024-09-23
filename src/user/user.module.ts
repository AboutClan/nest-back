import { MiddlewareConsumer, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User } from './entity/user.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: User }])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class AppModule {}
