import { WsAdapter } from '@nestjs/platform-ws';
import { MessageMappingProperties } from '@nestjs/websockets';
import { Observable, fromEvent, EMPTY } from 'rxjs';
import { mergeMap, filter } from 'rxjs/operators';
import * as WebSocket from 'ws';
import {
  GatewayCloseCode,
  GatewayCloseMessage,
} from '../enums/close-code.enum';

/**
 * 웹소켓 페이로드를 디스코드 게이트웨이 프로토콜에 맞게 처리하는 커스텀 어댑터
 *
 * 페이로드 구조:
 * ```json
 * {
 *  "op": 0, // 게이트웨이 오퍼레이션 코드
 *  "d": { ... }, // 이벤트 데이터 (구조는 이벤트마다 다름)
 *  "s": 42, // 시퀀스 번호 (이벤트 Dispatch 전용)
 *  "t": "MESSAGE_CREATE" // 이벤트 이름 (이벤트 Dispatch 전용)
 * }
 * ```
 */
export class DiscordWsAdapter extends WsAdapter {
  public bindMessageHandlers(
    client: WebSocket,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    const handlersMap = new Map<string, MessageMappingProperties>();
    handlers.forEach((handler) =>
      handlersMap.set(String(handler.message), handler),
    );

    fromEvent(client, 'message')
      .pipe(
        mergeMap((data: any) => {
          try {
            const message = JSON.parse(data.data);
            const opKey = String(message.op);
            const messageHandler = handlersMap.get(opKey);

            if (!messageHandler) {
              return EMPTY;
            }

            return transform(messageHandler.callback(message.d));
          } catch {
            // JSON 파싱 실패 등 페이로드 오류 발생 시 명시적으로 연결 종료
            client.close(
              GatewayCloseCode.DecodeError,
              GatewayCloseMessage[GatewayCloseCode.DecodeError],
            );
            return EMPTY;
          }
        }),
        filter((result) => result),
      )
      .subscribe((response) => client.send(JSON.stringify(response)));
  }
}
