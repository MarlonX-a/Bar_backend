import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
  }));

  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
