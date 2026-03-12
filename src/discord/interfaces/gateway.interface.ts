import { GatewayOpcode } from '../enums/opcode.enum';

export interface GatewayPayload<T = any> {
  op: GatewayOpcode; // 게이트웨이 오퍼레이션 코드
  d?: T; // 데이터
  s?: number | null; // 시퀀스 번호 (이벤트 Dispatch 전용)
  t?: string | null; // 이벤트 이름 (이벤트 Dispatch 전용)
}

export interface ClientState {
  authenticated: boolean;
  sessionId?: string;
  userId?: string;
}
