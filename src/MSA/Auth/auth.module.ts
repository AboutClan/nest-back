import { Module } from "@nestjs/common";
import { NiceContoller } from "./core/controllers/Nice.controller";
import { NiceService } from "./core/services/Nice.service";
import { MongooseModule } from "@nestjs/mongoose";
import { NiceAuthSession, NiceAuthSessionSchema } from "./entity/NiceToken.entity";


@Module({
    imports: [
        MongooseModule.forFeature([
            { name: NiceAuthSession.name, schema: NiceAuthSessionSchema }
        ]),
    ],
    controllers: [NiceContoller],
    providers: [NiceService],
    exports: [],
})
export class AuthModule { }
