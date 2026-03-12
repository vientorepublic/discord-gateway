import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DiscordWsAdapter } from './discord/adapters/discord.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 디스코드 게이트웨이 프로토콜 패킷({ op, d })을 처리하기 위한 커스텀 어댑터 연결
  app.useWebSocketAdapter(new DiscordWsAdapter(app));
  await app.listen(3000);
}
bootstrap();
