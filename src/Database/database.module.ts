import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI: string = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env',
  );
}
@Module({
  imports: [
    MongooseModule.forRoot(MONGODB_URI, {
      bufferCommands: false,
    }),
  ],
})
export class DatabaseModule {}
