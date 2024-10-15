import { ClassProvider, Module } from '@nestjs/common';
import { StaticController } from './static.controller';
import StaticService from './static.service';
import { UserModule } from 'src/user/user.module';
import { LogModule } from 'src/logz/log.module';
import { ISTATIC_SERVICE } from 'src/utils/di.tokens';

const staticServiceProvider: ClassProvider = {
  provide: ISTATIC_SERVICE,
  useClass: StaticService,
};

@Module({
  imports: [UserModule, LogModule],
  controllers: [StaticController],
  providers: [staticServiceProvider],
  exports: [staticServiceProvider],
})
export class StaticModule {}
