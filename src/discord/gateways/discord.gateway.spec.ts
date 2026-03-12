import { Test, TestingModule } from '@nestjs/testing';
import { DiscordGateway } from './discord.gateway';
import { DiscordClientService } from '../services/discord-client.service';
import { WebSocket } from 'ws';
import { IdentifyDto } from '../dtos/identify.dto';

describe('DiscordGateway', () => {
  let gateway: DiscordGateway;
  let service: DiscordClientService;

  beforeEach(async () => {
    // Service Mock 설정
    const mockDiscordClientService = {
      registerClient: jest.fn(),
      unregisterClient: jest.fn(),
      handleHeartbeat: jest.fn(),
      authenticateClient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordGateway,
        {
          provide: DiscordClientService,
          useValue: mockDiscordClientService,
        },
      ],
    }).compile();

    gateway = module.get<DiscordGateway>(DiscordGateway);
    service = module.get<DiscordClientService>(DiscordClientService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should call registerClient on connection', () => {
    const client = {} as WebSocket;
    gateway.handleConnection(client);
    expect(service.registerClient).toHaveBeenCalledWith(client);
  });

  it('should call unregisterClient on disconnect', () => {
    const client = {} as WebSocket;
    gateway.handleDisconnect(client);
    expect(service.unregisterClient).toHaveBeenCalledWith(client);
  });

  it('should call handleHeartbeat when Heartbeat opcode is received', () => {
    const client = {} as WebSocket;
    gateway.handleHeartbeat(client);
    expect(service.handleHeartbeat).toHaveBeenCalledWith(client);
  });

  it('should call authenticateClient when Identify opcode is received', () => {
    const client = {} as WebSocket;
    const identifyData: IdentifyDto = {
      token: 'token',
      intents: 123,
      properties: { os: 'mac', browser: 'jest', device: 'jest' },
    };
    gateway.handleIdentify(identifyData, client);
    expect(service.authenticateClient).toHaveBeenCalledWith(
      client,
      identifyData,
    );
  });
});
