import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DatabaseModule } from 'src/Database/database.module';
// AppModule과 같은 순서로 UserModule을 먼저 불러온다. Vote2Module부터 불러오면 모듈 파일 사이의
// 순환 import 때문에 NoticeModule이 undefined로 잡혀 컨텍스트가 뜨지 않는다.
import { UserModule } from 'src/MSA/User/user.module';
import { Vote2Service } from 'src/MSA/Study/core/services/vote2.service';
import { Vote2Module } from 'src/MSA/Study/vote2.module';

/**
 * 스터디 가짜 신청자 시딩을 한 번 돌린다(매일 00:10 배치 seedStudyDummy와 같은 동작).
 *
 * 내일~7일 뒤의 가짜 신청자를 현재 기준으로 맞춘다 — 기준과 다른 가짜는 빼고 빠진 것만 넣는다.
 * 시딩 기준을 바꾼 뒤 다음 날 00:10을 기다리지 않고 바로 반영할 때 쓴다.
 * ScheduleLog를 남기지 않으므로 그날 00:10 배치도 그대로 돈다(같은 결과라 무해하다).
 *
 * 주의: 운영 DB(.env의 MONGODB_URI)에 바로 쓴다.
 *   npm run study:seed-dummy
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UserModule,
    Vote2Module,
  ],
})
class SeedStudyDummyModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(SeedStudyDummyModule, {
    logger: ['error', 'warn'],
  });
  try {
    await app.get(Vote2Service).seedDummyParticipations();
    console.log('스터디 가짜 신청자 시딩 완료');
  } finally {
    await app.close();
  }
  // Redis 등 열린 연결이 남아 프로세스가 끝나지 않으므로 명시적으로 종료한다.
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
