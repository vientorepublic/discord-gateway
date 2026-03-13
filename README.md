# Discord Gateway Mock Server

이 프로젝트는 [Discord의 Developer 웹소켓 게이트웨이 프로토콜](https://docs.discord.com/developers/events/gateway) 레퍼런스를 분석하고 이를 웹소켓 환경에서 모방/구현해보는 NestJS 기반의 프로젝트입니다.

## 1. 프로토콜 분석 및 모방

Discord는 클라이언트(봇/사용자)와 실시간 이벤트를 주고받기 위해 독자적인 형태의 웹소켓 기반 게이트웨이 프로토콜을 사용합니다.

본 프로젝트에서는 이러한 Discord의 통신 규격을 NestJS를 통해 자체적으로 구현하며, 크게 아래의 핵심 기능들의 모방을 목표로 합니다.

- **Opcode (Operation Codes) 기반 통신:** 단순 문자열 이벤트명이 아닌 `op`, `d`, `s`, `t` 네 가지 주요 프로퍼티로 이루어진 JSON 페이로드를 사용합니다.
- **Hello (Opcode 10) & Heartbeat (Opcode 1) 메커니즘:** 서버 연결 시 서버가 `Hello`와 `heartbeat_interval`을 보내고, 클라이언트는 주기적으로 생존 신고(Heartbeat)를 해야 합니다.
- **Identity (Opcode 2) & Ready (Opcode 0):** 연결 초기화 이후 클라이언트 측에서 인증(`Identify`)을 보내면, 서버 측에서 연결 완료(`READY`) 이벤트를 반환합니다.

## 2. NestJS 웹소켓 게이트웨이 구현

NestJS의 웹소켓 라이브러리(`@nestjs/websockets`, `@nestjs/platform-ws`)를 기반으로 구현되었습니다.

Discord의 프로토콜은 기본적으로 `{ "event": "", "data": "" }` 형식이 아니기 때문에, 이 프로젝트에서는 Custom WsAdapter (`DiscordWsAdapter`)를 구현하여 Discord의 형식(`{ "op": X, "d": ... }`)을 NestJS의 `@SubscribeMessage(Opcode)` 데코레이터에서 인식할 수 있도록 변환합니다.

구현 핵심 파일:

- `src/main.ts`: 프로젝트 초기화 및 `DiscordWsAdapter` 적용
- `src/discord/discord.adapter.ts`: `{ op, d }` 페이로드를 파싱하는 커스텀 어댑터
- `src/discord/discord.gateway.ts`: 실제 웹소켓 서버 (`handleConnection`, `Identify`, `Heartbeat` 처리)

## 3. 예시 코드 (Discord Gateway 모방 테스트)

이 프로젝트 루트 디렉토리에 포함된 `test-client.js`를 사용하면 Node.js 환경에서 순수 ws 클라이언트로 서버와 통신을 테스트해 볼 수 있습니다.

### 테스트 실행 방법

1. 의존성 설치:

```bash
npm install
```

2. 서버 실행:

```bash
npm run start:dev
```

3. 다른 터미널을 열고 클라이언트 실행:

```bash
node test-client.js
```

## 4. 라이선스

MIT
