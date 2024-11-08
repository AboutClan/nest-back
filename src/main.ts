import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://about-aboutclub20s-projects.vercel.app',
      'https://studyabout.herokuapp.com',
    ], // 허용하고자 하는 URL 목록을 배열로 작성
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: '*',
  });
  const port = process.env.PORT || 3001;
  await app.listen(port);
}
bootstrap();
