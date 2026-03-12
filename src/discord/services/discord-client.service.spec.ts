import { Test, TestingModule } from '@nestjs/testing';
import { DiscordClientService } from './discord-client.service';
import { WebSocket } from 'ws';
import { GatewayOpcode } from '../enums/opcode.enum';
import { GatewayEvent } from '../enums/event.enum';
import { IdentifyDto } from '../dtos/identify.dto';

describe('DiscordClientService', () => {
  let service: DiscordClientService;
  let mockWsClient: jest.Mocked<WebSocket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscordClientService],
    }).compile();

    service = module.get<DiscordClientService>(DiscordClientService);

    mockWsClient = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
    } as unknown as jest.Mocked<WebSocket>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerClient', () => {
    it('should register a new client and send a Hello payload', () => {
      service.registerClient(mockWsClient);

      // 클라이언트가 연결되면 Opcode 10(Hello)이 전송되어야 함
      expect(mockWsClient.send).toHaveBeenCalledTimes(1);

      const payload = JSON.parse(
        (mockWsClient.send as jest.Mock).mock.calls[0][0],
      );
      expect(payload.op).toBe(GatewayOpcode.Hello);
      expect(payload.d.heartbeat_interval).toBeGreaterThan(0);
    });
  });

  describe('handleHeartbeat', () => {
    it('should send a HeartbeatAck payload upon receiving heartbeat', () => {
      service.handleHeartbeat(mockWsClient);

      expect(mockWsClient.send).toHaveBeenCalledTimes(1);

      const payload = JSON.parse(
        (mockWsClient.send as jest.Mock).mock.calls[0][0],
      );
      expect(payload.op).toBe(GatewayOpcode.HeartbeatAck);
    });
  });

  describe('authenticateClient', () => {
    it('should authenticate client and send READY event', () => {
      // 사전에 클라이언트 등록
      service.registerClient(mockWsClient);
      (mockWsClient.send as jest.Mock).mockClear();

      const identifyData: IdentifyDto = {
        token: 'fake-token',
        intents: 513,
        properties: {
          os: 'macos',
          browser: 'dummy',
          device: 'dummy',
        },
      };

      service.authenticateClient(mockWsClient, identifyData);

      expect(mockWsClient.send).toHaveBeenCalledTimes(1);

      const payload = JSON.parse(
        (mockWsClient.send as jest.Mock).mock.calls[0][0],
      );
      expect(payload.op).toBe(GatewayOpcode.Dispatch);
      expect(payload.t).toBe(GatewayEvent.READY);
      expect(payload.d.user.username).toBe('MockUser');
      expect(payload.d.session_id).toBeDefined();
    });
  });

  describe('dispatchEvent', () => {
    it('should not dispatch event if client is not authenticated', () => {
      service.registerClient(mockWsClient);
      (mockWsClient.send as jest.Mock).mockClear();

      service.dispatchEvent(mockWsClient, GatewayEvent.MESSAGE_CREATE, {
        content: 'hello',
      });

      // 인증되지 않았으므로 전송되지 않아야 함
      expect(mockWsClient.send).not.toHaveBeenCalled();
    });

    it('should dispatch event successfully if client is authenticated', () => {
      service.registerClient(mockWsClient);
      service.authenticateClient(mockWsClient, {
        token: 'test',
        intents: 0,
        properties: { os: '', browser: '', device: '' },
      });
      (mockWsClient.send as jest.Mock).mockClear();

      service.dispatchEvent(mockWsClient, GatewayEvent.MESSAGE_CREATE, {
        content: 'hello',
      });

      expect(mockWsClient.send).toHaveBeenCalledTimes(1);

      const payload = JSON.parse(
        (mockWsClient.send as jest.Mock).mock.calls[0][0],
      );
      expect(payload.op).toBe(GatewayOpcode.Dispatch);
      expect(payload.t).toBe(GatewayEvent.MESSAGE_CREATE);
      expect(payload.d.content).toBe('hello');
    });
  });
});
