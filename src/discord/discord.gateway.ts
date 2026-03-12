// src/discord/discord.gateway.ts
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

// 디스코드 게이트웨이 OP코드 (Opcode)
export enum GatewayOpcode {
  Dispatch = 0,
  Heartbeat = 1,
  Identify = 2,
  PresenceUpdate = 3,
  VoiceStateUpdate = 4,
  Resume = 6,
  Reconnect = 7,
  RequestGuildMembers = 8,
  InvalidSession = 9,
  Hello = 10,
  HeartbeatAck = 11,
}

// 디스코드 게이트웨이 페이로드 (Payload)
export interface GatewayPayload {
  op: GatewayOpcode; // 게이트웨이 오퍼레이션 코드
  d?: any; // 데이터
  s?: number | null; // 시퀀스 번호 (이벤트Dispatch 전용)
  t?: string | null; // 이벤트 이름 (이벤트Dispatch 전용)
}

@WebSocketGateway({ path: '/api/gateway' })
export class DiscordGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<WebSocket, any> = new Map();
  private sequenceNum = 1;

  // 1. 클라이언트(봇/유저)가 웹소켓 서버에 연결
  handleConnection(client: WebSocket) {
    console.log('Client connected');
    this.connectedClients.set(client, { authenticated: false });

    // 시작 시 'Hello' Payload 전송
    const helloPayload: GatewayPayload = {
      op: GatewayOpcode.Hello,
      d: {
        heartbeat_interval: 45000, // 45초마다 하트비트 전송 요구
      },
    };

    // WsAdapter는 객체를 자동으로 stringify하지 않을 수 있으므로 명시적으로 문자열 변환하여 전송
    client.send(JSON.stringify(helloPayload));
  }

  handleDisconnect(client: WebSocket) {
    console.log('Client disconnected');
    this.connectedClients.delete(client);
  }

  // 2. 하트비트 처리 (Opcode 1)
  // 클라이언트가 주기적으로 보내는 생존신호에 대한 응답
  @SubscribeMessage(GatewayOpcode.Heartbeat)
  handleHeartbeat(
    @MessageBody() data: any,
    @ConnectedSocket() client: WebSocket,
  ) {
    console.log('Received Heartbeat, sending Ack');
    // 클라이언트에게 Heartbeat Ack (Opcode 11) 반환
    const ackPayload: GatewayPayload = {
      op: GatewayOpcode.HeartbeatAck,
    };
    client.send(JSON.stringify(ackPayload));
  }

  // 3. 인증/식별 처리 (Opcode 2 Identify)
  @SubscribeMessage(GatewayOpcode.Identify)
  handleIdentify(
    @MessageBody() data: any,
    @ConnectedSocket() client: WebSocket,
  ) {
    console.log('Received Identify Payload:', data);

    // 이 단계에서 token 검증 등의 로직이 들어갑니다.
    // 여기서는 무조건 성공한다고 가정하고 Ready 이벤트를 보냅니다.
    const clientState = this.connectedClients.get(client) || {};
    clientState.authenticated = true;
    this.connectedClients.set(client, clientState);

    // 인증 완료시 Ready 이벤트 (Opcode 0, Dispatch) 전송
    const readyPayload: GatewayPayload = {
      op: GatewayOpcode.Dispatch,
      t: 'READY',
      s: this.sequenceNum++,
      d: {
        v: 10,
        user: {
          id: '123456789012345678',
          username: 'MockUser',
          discriminator: '0000',
        },
        session_id: 'mock_session_id_123',
      },
    };

    client.send(JSON.stringify(readyPayload));
  }
}
