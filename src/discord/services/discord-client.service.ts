import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import { ClientState, GatewayPayload } from '../interfaces/gateway.interface';
import { GatewayOpcode } from '../enums/opcode.enum';
import { GatewayEvent } from '../enums/event.enum';
import { IdentifyDto } from '../dtos/identify.dto';

@Injectable()
export class DiscordClientService {
  private readonly logger = new Logger(DiscordClientService.name);
  private connectedClients: Map<WebSocket, ClientState> = new Map();
  private sequenceNum = 1;

  registerClient(client: WebSocket): void {
    this.logger.log('New client connected');
    this.connectedClients.set(client, { authenticated: false });

    // 시작 시 'Hello' Payload 전송
    this.sendPayload(client, {
      op: GatewayOpcode.Hello,
      d: {
        heartbeat_interval: 45000,
      },
    });
  }

  unregisterClient(client: WebSocket): void {
    this.logger.log('Client disconnected');
    this.connectedClients.delete(client);
  }

  handleHeartbeat(client: WebSocket): void {
    this.logger.log('Received Heartbeat, sending Ack');
    this.sendPayload(client, {
      op: GatewayOpcode.HeartbeatAck,
    });
  }

  authenticateClient(client: WebSocket, identifyData: IdentifyDto): void {
    this.logger.log(`Authenticating client with token: ${identifyData?.token}`);

    const clientState = this.connectedClients.get(client) || {
      authenticated: false,
    };

    // 토큰 검증 로직 (여기서는 임의로 모두 성공으로 처리)
    clientState.authenticated = true;
    clientState.sessionId = `session_${Math.random().toString(36).substring(2, 9)}`;
    clientState.userId = '123456789012345678';

    this.connectedClients.set(client, clientState);

    // 인증 완료시 Ready 이벤트 (Opcode 0, Dispatch) 전송
    this.sendPayload(client, {
      op: GatewayOpcode.Dispatch,
      t: GatewayEvent.READY,
      s: this.getNextSequence(),
      d: {
        v: 10,
        user: {
          id: clientState.userId,
          username: 'MockUser',
          discriminator: '0000',
        },
        session_id: clientState.sessionId,
      },
    });
  }

  // 특정한 클라이언트에게 이벤트를 Dispatch 할 수 있는 유틸리티 메서드
  public dispatchEvent(
    client: WebSocket,
    eventName: GatewayEvent,
    data: any,
  ): void {
    const clientState = this.connectedClients.get(client);
    if (!clientState?.authenticated) {
      this.logger.warn('Tried to dispatch event to unauthenticated client.');
      return;
    }

    this.sendPayload(client, {
      op: GatewayOpcode.Dispatch,
      t: eventName,
      s: this.getNextSequence(),
      d: data,
    });
  }

  // --- Helper Methods ---

  private sendPayload(client: WebSocket, payload: GatewayPayload): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  }

  private getNextSequence(): number {
    return this.sequenceNum++;
  }
}
