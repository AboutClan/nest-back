import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'error',
  transports: [
    new winston.transports.Console({ format: winston.format.json() }),
  ],
});

// ✅ 전역 에러 핸들링에서 Winston 사용
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🔥 Unhandled Rejection', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('🔥 Uncaught Exception', { error });
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    bodyParser: true,
    rawBody: true,
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({ format: winston.format.json() }),
      ],
    }),
  });

  //Error Handling

  //Cors설정
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://about-aboutclub20s-projects.vercel.app',
      'https://studyabout.herokuapp.com',
      'https://about-front.kro.kr',
      'https://study-about.club',
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
  await app.listen(port);
}
bootstrap();
