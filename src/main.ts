import { HttpException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { AppModule } from './app.module';

const logger = winston.createLogger({
  level: 'error',
  transports: [
    new winston.transports.Console({ format: winston.format.json() }),
  ],
});

// ✅ 전역 에러 핸들링에서 Winston 사용
process.on('unhandledRejection', (reason, promise) => {
  if (reason instanceof HttpException) {
    // 이미 HttpExceptionFilter에서 처리했으니 무시
    return;
  }
  logger.error('🔥 Unhandled Rejection', { reason });
});

process.on('uncaughtException', (error) => {
  if (error instanceof HttpException) {
    // HttpExceptionFilter가 처리한 경우라면 중복 로그 방지
    return;
  }
  logger.error('🔥 Uncaught Exception', { error });
});

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    bodyParser: true,
    rawBody: true,
    logger: isProd
      ? WinstonModule.createLogger({
          transports: [
            new winston.transports.Console({
              format: winston.format.json(),
            }),
          ],
        })
      : ['log', 'error', 'warn', 'debug', 'verbose'], // 기본 Nest Logger 사용
  });

  //Error Handling

  //Cors설정
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://about-aboutclub20s-projects.vercel.app',
      'http://localhost:5500', // VS Code Live Server (localhost 접속용)
      'http://127.0.0.1:5500', // VS Code Live Server (IP 접속용) - 추가!
      'https://studyabout.herokuapp.com',
      'https://about-front.kro.kr',
      'https://study-about.club',
      'https://xn--ob0b42knwutje.com',
      'https://카공지도.com',
    ], // 허용하고자 하는 URL 목록을 배열로 작성
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: '*',
  });

  //swaggerModule
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API description')
    .setVersion('1.0')
    .addTag('example')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3001;
  await app
    .listen(port)
    .catch((err) => console.error('🔴 Failed to listen:', err));
}
bootstrap();
