import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NiceContoller } from './core/controllers/Nice.controller';
import { AuthController } from './core/controllers/auth.controller';
import { AuthService } from './core/services/auth.service';
import { NiceService } from './core/services/Nice.service';
import { OAuthAuthService } from './core/services/oauth-auth.service';
import { NiceAuthSession, NiceAuthSessionSchema } from './entity/NiceToken.entity';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: NiceAuthSession.name, schema: NiceAuthSessionSchema },
        ]),
    ],
    controllers: [NiceContoller, AuthController],
    providers: [NiceService, AuthService, OAuthAuthService],
    exports: [AuthService, OAuthAuthService],
})
export class AuthModule {}
