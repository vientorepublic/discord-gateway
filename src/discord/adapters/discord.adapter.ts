import { WsAdapter } from '@nestjs/platform-ws';
import { MessageMappingProperties } from '@nestjs/websockets';
import { Observable, fromEvent, EMPTY } from 'rxjs';
import { mergeMap, filter } from 'rxjs/operators';
import * as WebSocket from 'ws';

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
    // 데코레이터에서 문자열이나 숫자로 들어온 값을 전부 문자열로 통일하여 매핑합니다.
    handlers.forEach((handler) =>
      handlersMap.set(String(handler.message), handler),
    );

    fromEvent(client, 'message')
      .pipe(
        mergeMap((data) =>
          this.bindMessageHandler(data, handlersMap, transform),
        ),
        filter((result) => result),
      )
      .subscribe((response) => client.send(JSON.stringify(response)));
  }

  public bindMessageHandler(
    buffer: any,
    handlersMap: Map<string, MessageMappingProperties>,
    transform: (data: any) => Observable<any>,
  ): Observable<any> {
    try {
      const message = JSON.parse(buffer.data);
      // 핸들러를 통일된 opcode(문자열) 기준으로 찾습니다.
      const opKey = String(message.op);
      const messageHandler = handlersMap.get(opKey);

      if (!messageHandler) {
        return EMPTY;
      }

      // 변환된 데이터를 처리하도록 NestJS 파이프라인에 콜백을 전달합니다. (여기서는 커스텀 매개변수를 쓰기 위해)
      // 원래 NestJS WebSocket 데코레이터는 MessageBody와 ConnectedSocket을 사용하므로,
      // 데이터뿐만 아니라 client 객체를 함께 넘길 수 있도록 수정하는 것이 일반적이지만,
      // 현재 WsAdapter 구조를 최대한 유지하면서 페이로드 객체 자체를 리턴합니다.
      return transform(messageHandler.callback(message.d));
    } catch {
      return EMPTY;
    }
  }
}
