import { WsAdapter } from '@nestjs/platform-ws';
import { MessageMappingProperties } from '@nestjs/websockets';
import { Observable, fromEvent, EMPTY } from 'rxjs';
import { mergeMap, filter } from 'rxjs/operators';
import * as WebSocket from 'ws';

// 디스코드 페이로드는 { op: 번호, d: 데이터, s: 시퀀스, t: 이벤트이름 } 형식을 갖습니다.
export class DiscordWsAdapter extends WsAdapter {
  public bindMessageHandlers(
    client: WebSocket,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    const handlersMap = new Map<string, MessageMappingProperties>();
    handlers.forEach((handler) => handlersMap.set(handler.message, handler));

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
      // 핸들러를 opcode (op)를 기준으로 찾습니다.
      const opKey = message.op?.toString();
      const messageHandler = handlersMap.get(opKey);

      if (!messageHandler) {
        return EMPTY;
      }
      return transform(messageHandler.callback(message.d));
    } catch {
      return EMPTY;
    }
  }
}
