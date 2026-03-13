import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { GatewayOpcode } from '../enums/opcode.enum';
import { DiscordClientService } from '../services/discord-client.service';
import { IdentifyDto } from '../dtos/identify.dto';
import { ResumeDto } from '../dtos/resume.dto';

@WebSocketGateway({ path: '/api/gateway' })
export class DiscordGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly discordClientService: DiscordClientService) {}

  // 1. 클라이언트(봇/유저)가 웹소켓 서버에 연결
  handleConnection(client: WebSocket) {
    this.discordClientService.registerClient(client);
  }

  handleDisconnect(client: WebSocket) {
    this.discordClientService.unregisterClient(client);
  }

  // 2. 하트비트 처리 (Opcode 1)
  @SubscribeMessage(GatewayOpcode.Heartbeat)
  handleHeartbeat(@ConnectedSocket() client: WebSocket) {
    this.discordClientService.handleHeartbeat(client);
  }

  // 3. 인증/식별 처리 (Opcode 2 Identify)
  @SubscribeMessage(GatewayOpcode.Identify)
  handleIdentify(
    @MessageBody() data: IdentifyDto,
    @ConnectedSocket() client: WebSocket,
  ) {
    this.discordClientService.authenticateClient(client, data);
  }

  // 4. 상태 업데이트 처리 (Opcode 3 Presence Update)
  @SubscribeMessage(GatewayOpcode.PresenceUpdate)
  handlePresenceUpdate(
    @MessageBody() data: any,
    @ConnectedSocket() client: WebSocket,
  ) {
    this.discordClientService.handlePresenceUpdate(client, data);
  }

  // 5. 연결 재개 처리 (Opcode 6 Resume)
  @SubscribeMessage(GatewayOpcode.Resume)
  handleResume(
    @MessageBody() data: ResumeDto,
    @ConnectedSocket() client: WebSocket,
  ) {
    this.discordClientService.resumeSession(client, data);
  }
}
