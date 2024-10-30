import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'https://studyabout.herokuapp.com',
    methods: 'GET, HEAD, PUT, PATCH, POST, DELETE',
    allowedHeaders: 'Content-Type,Authorization', // 허용할 헤더
    credentials: true,
  });
  // 직접 헤더 추가
  app.use((req, res, next) => {
    res.header(
      'Access-Control-Allow-Origin',
      'https://studyabout.herokuapp.com',
    );
    res.header(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE',
    );
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
  });
  await app.listen(3001);
}
bootstrap();
