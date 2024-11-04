import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.enableCors({
    origin: 'https://studyabout.herokuapp.com',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: '*',
  });
  const port = process.env.PORT || 3001;
  await app.listen(port);
}
bootstrap();
