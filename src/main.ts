import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek'; // isoWeek 플러그인 가져오기

dayjs.extend(isoWeek); // 플러그인 확장
const date = dayjs(); // 예시 날짜
const startOfWeek = dayjs(date).startOf('isoWeek'); // ISO 8601 기준 주의 시작 (월요일)

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
