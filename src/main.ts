import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('test');
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.enableCors({
    origin: 'https://studyabout.herokuapp.com',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: '*',
  });
  console.log('hello');
  await app.listen(3001);
}
bootstrap();
