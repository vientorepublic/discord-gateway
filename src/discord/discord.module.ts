import { Module } from '@nestjs/common';
import { DiscordGateway } from './discord.gateway';

@Module({
  providers: [DiscordGateway],
})
export class DiscordModule {}
