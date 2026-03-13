import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import {
  ClientState,
  SessionState,
  GatewayPayload,
} from '../interfaces/gateway.interface';
import { GatewayOpcode } from '../enums/opcode.enum';
import { GatewayEvent } from '../enums/event.enum';
import { IdentifyDto } from '../dtos/identify.dto';
import { ResumeDto } from '../dtos/resume.dto';

@Injectable()
export class DiscordClientService {
  private readonly maxGatewayBufferSize = 50;
  private readonly logger = new Logger(DiscordClientService.name);
  private connectedClients: Map<WebSocket, ClientState> = new Map();
  private sessions: Map<string, SessionState> = new Map();

  registerClient(client: WebSocket): void {
    this.logger.log('New client connected');
    this.connectedClients.set(client, { authenticated: false });

    // Hello 페이로드 전송
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

    const sessionId = `session_${Math.random().toString(36).substring(2, 9)}`;
    const session: SessionState = {
      sessionId,
      token: identifyData.token, // 실제로는 토큰 검증 로직이 필요하지만, 여기서는 단순히 세션에 저장하는 것으로 가정
      userId: '123456789012345678',
      sequenceNum: 0,
      eventBuffer: [],
    };

    this.sessions.set(sessionId, session);

    this.connectedClients.set(client, {
      authenticated: true,
      sessionId,
    });

    // 인증 완료시 Ready 이벤트 (Opcode 0, Dispatch) 전송
    this.sendDispatchPayload(client, GatewayEvent.READY, {
      v: 10,
      user: {
        id: session.userId,
        username: 'MockUser',
        discriminator: '0000',
      },
      session_id: sessionId,
    });
  }

  resumeSession(client: WebSocket, resumeData: ResumeDto): void {
    this.logger.log(`Attempting to resume session: ${resumeData.session_id}`);

    const session = this.sessions.get(resumeData.session_id);

    // 세션이 존재하지 않거나 토큰이 불일치하는 경우 무효한 세션 처리
    if (!session || session.token !== resumeData.token) {
      this.logger.warn('Resume failed: Invalid session or token mismatch.');
      this.sendPayload(client, {
        op: GatewayOpcode.InvalidSession,
        d: false, // false이면 연결을 재개할 수 없고, 새로 Identify 해야 함을 나타냄
      });
      return;
    }

    // 커넥션 상태 업데이트
    this.connectedClients.set(client, {
      authenticated: true,
      sessionId: session.sessionId,
    });

    // 누락된 이벤트 재전송 (버퍼에 저장된 이벤트 중 클라이언트가 마지막으로 받은 seq(s)보다 큰 이벤트)
    const missedEvents = session.eventBuffer.filter(
      (event) =>
        event.s !== null && event.s !== undefined && event.s > resumeData.seq,
    );

    for (const event of missedEvents) {
      this.logger.log(`Replaying missed event: ${event.t} (seq: ${event.s})`);
      this.sendPayload(client, event);
    }

    // 재전송 후 RESUMED 이벤트 전송
    this.sendDispatchPayload(client, GatewayEvent.RESUMED, {});
    this.logger.log(`Session resumed successfully: ${session.sessionId}`);
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

    this.sendDispatchPayload(client, eventName, data);
  }

  handlePresenceUpdate(client: WebSocket, data: any): void {
    const clientState = this.connectedClients.get(client);
    if (!clientState?.authenticated) {
      this.logger.warn('Unauthenticated client tried to update presence.');
      return;
    }
    this.logger.log(`Presence Update Info: ${JSON.stringify(data)}`);
  }

  // --- Helper Methods ---

  private sendDispatchPayload(
    client: WebSocket,
    eventName: GatewayEvent,
    data: any,
  ): void {
    const clientState = this.connectedClients.get(client);
    if (!clientState?.sessionId) return;

    const session = this.sessions.get(clientState.sessionId);
    if (!session) return;

    session.sequenceNum += 1;

    const payload: GatewayPayload = {
      op: GatewayOpcode.Dispatch,
      t: eventName,
      s: session.sequenceNum,
      d: data,
    };

    // 재연결(Resume)을 위해 이벤트를 버퍼에 저장. 메모리 누수를 방지하기 위해 최대 N개로 유지.
    session.eventBuffer.push(payload);
    if (session.eventBuffer.length > this.maxGatewayBufferSize) {
      session.eventBuffer.shift();
    }

    this.sendPayload(client, payload);
  }

  private sendPayload(client: WebSocket, payload: GatewayPayload): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  }
}
