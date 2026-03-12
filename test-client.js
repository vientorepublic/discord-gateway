const WebSocket = require('ws');

// 연결할 게이트웨이 주소
const ws = new WebSocket('ws://localhost:3000/api/gateway');

let heartbeatInterval = null;

ws.on('open', () => {
  console.log('[Client] Connected to Gateway');
});

ws.on('message', (data) => {
  const payload = JSON.parse(data);
  console.log('\n[Client] Received payload:', payload);

  switch (payload.op) {
    case 10: // Hello
      console.log(
        `[Client] Received Hello. Heartbeat Interval: ${payload.d.heartbeat_interval}ms`,
      );

      // 1. 하트비트 시작 (예시를 위해 인터벌을 5초로 단축하거나 받은 값을 그대로 사용)
      heartbeatInterval = setInterval(() => {
        console.log('[Client] Sending Heartbeat (op: 1)...');
        ws.send(
          JSON.stringify({
            op: 1,
            d: null,
          }),
        );
      }, 5000); // 테스트를 위해 5초마다 전송

      // 2. Identify 페이로드 전송 (op: 2)
      console.log('[Client] Sending Identify (op: 2)...');
      ws.send(
        JSON.stringify({
          op: 2,
          d: {
            token: 'my_fake_token',
            properties: {
              os: 'linux',
              browser: 'my_library',
              device: 'my_library',
            },
            intents: 513,
          },
        }),
      );
      break;

    case 11: // Heartbeat ACK
      console.log('[Client] Received Heartbeat ACK (op: 11)!');
      break;

    case 0: // Dispatch
      console.log(`[Client] Received Dispatch Event (${payload.t})!`);
      if (payload.t === 'READY') {
        console.log('[Client] Bot is Ready! User:', payload.d.user.username);
      }
      break;

    default:
      console.log('[Client] Unknown Opcode:', payload.op);
  }
});

ws.on('close', () => {
  console.log('[Client] Disconnected from Gateway');
  if (heartbeatInterval) clearInterval(heartbeatInterval);
});

ws.on('error', (error) => {
  console.error('[Client] WebSocket Error:', error);
});
