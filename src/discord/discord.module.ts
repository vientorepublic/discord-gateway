import { Module } from '@nestjs/common';
import { DiscordGateway } from './gateways/discord.gateway';
import { DiscordClientService } from './services/discord-client.service';

@Module({
  providers: [DiscordGateway, DiscordClientService],
})
export class DiscordModule {}
