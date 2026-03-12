const WebSocket = require('ws');

// ---------------------------------------------------------
// Discord Gateway 통신을 모방한 Mock 클라이언트 클래스
// ---------------------------------------------------------
class MockDiscordClient {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.ws = null;
    this.heartbeatIntervalId = null;
    this.sequenceNum = null;

    // 로깅 색상 유틸
    this.colors = {
      reset: '\x1b[0m',
      green: '\x1b[32m',
      cyan: '\x1b[36m',
      yellow: '\x1b[33m',
      red: '\x1b[31m',
      magenta: '\x1b[35m',
    };
  }

  log(color, prefix, ...args) {
    console.log(`${color}[${prefix}]${this.colors.reset}`, ...args);
  }

  connect() {
    this.log(this.colors.cyan, 'System', `Connecting to ${this.url}...`);
    this.ws = new WebSocket(this.url);

    this.ws.on('open', this.onOpen.bind(this));
    this.ws.on('message', this.onMessage.bind(this));
    this.ws.on('close', this.onClose.bind(this));
    this.ws.on('error', this.onError.bind(this));
  }

  // 연결 완료 이벤트
  onOpen() {
    this.log(this.colors.green, 'Socket', 'Connected to Gateway successfully.');
  }

  // 게이트웨이 파싱
  onMessage(data) {
    const payload = JSON.parse(data);

    if (payload.s !== undefined) {
      this.sequenceNum = payload.s;
    }

    this.log(
      this.colors.magenta,
      'Receive',
      `OP: ${payload.op} | Event: ${payload.t || 'None'}`,
      payload.d ? payload.d : '',
    );

    switch (payload.op) {
      case 10: // Hello
        this.handleHello(payload.d);
        break;
      case 11: // HeartbeatAck
        this.log(this.colors.green, 'Ack', 'Heartbeat acknowledged by server.');
        break;
      case 0: // Dispatch
        this.handleDispatch(payload);
        break;
      default:
        this.log(
          this.colors.yellow,
          'Warning',
          `Unhandled OP Code: ${payload.op}`,
        );
    }
  }

  // 연결 종료 이벤트
  onClose() {
    this.log(this.colors.red, 'Socket', 'Disconnected from Gateway.');
    this.stopHeartbeat();
  }

  // 에러 발생 이벤트
  onError(error) {
    this.log(this.colors.red, 'Error', error);
  }

  // --- 프로토콜 핸들러 --- //

  handleHello(data) {
    const heartbeatInterval = data.heartbeat_interval;
    this.log(
      this.colors.cyan,
      'Protocol',
      `Hello received. Starting heartbeat every ${heartbeatInterval}ms (mocked to 5000ms for testing)`,
    );

    // 실제로는 server가 준 heartbeat_interval을 써야하지만 테스트를 위해 5초로 고정
    this.startHeartbeat(5000);
    this.sendIdentify();
  }

  handleDispatch(payload) {
    if (payload.t === 'READY') {
      this.log(
        this.colors.green,
        'Ready',
        `Bot is fully authenticated and ready! User: ${payload.d.user.username}`,
      );

      // Ready 이후 다른 테스트용 행동 실행
      this.simulateClientActions();
    } else if (payload.t === 'MESSAGE_CREATE') {
      this.log(
        this.colors.green,
        'Chat',
        `New Message received: ${payload.d.content}`,
      );
    }
  }

  // --- 발신 메서드 --- //

  sendPayload(op, d, t = null) {
    const payload = { op, d };
    if (t) payload.t = t;

    this.log(this.colors.yellow, 'Send', `OP: ${op}${t ? ` Event: ${t}` : ''}`);
    this.ws.send(JSON.stringify(payload));
  }

  startHeartbeat(interval) {
    if (this.heartbeatIntervalId) clearInterval(this.heartbeatIntervalId);

    this.heartbeatIntervalId = setInterval(() => {
      this.sendPayload(1, this.sequenceNum);
    }, interval);
  }

  stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  sendIdentify() {
    this.sendPayload(2, {
      token: this.token,
      properties: {
        os: process.platform,
        browser: 'mock-discord-client',
        device: 'mock-discord-client',
      },
      intents: 513,
    });
  }

  // --- 추가 테스트용 행동 시뮬레이션 --- //
  simulateClientActions() {
    this.log(this.colors.cyan, 'Test', 'Simulating client actions...');

    // 1. 2초 후 상태 업데이트 (Presence Update - Opcode 3) 테스트
    setTimeout(() => {
      this.log(this.colors.cyan, 'Test', 'Sending Presence Update (Opcode 3)');
      this.sendPayload(3, {
        since: 91879201,
        activities: [
          {
            name: 'Testing Gateway',
            type: 0,
          },
        ],
        status: 'dnd',
        afk: false,
      });
    }, 2000);

    // 2. 4초 후 임의의 이벤트(예: 메시지 작성 시도)
    // 참고: 원래 Discord Gateway 클라이언트는 메시지를 직접 전송하지 않고 HTTP API를 쓰지만,
    // 여기서는 양방향 소켓 테스트 목적으로 클라이언트가 직접 이벤트를 보내는 것을 가정할 수도 있습니다.
  }
}

// ---------------------------------------------------------
// 클라이언트 실행
// ---------------------------------------------------------
const GATEWAY_URL = 'ws://localhost:3000/api/gateway';
const TOKEN = 'mock_test_token_12345';

const client = new MockDiscordClient(GATEWAY_URL, TOKEN);
client.connect();
