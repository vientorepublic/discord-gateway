export class IdentifyDto {
  token: string;
  properties: {
    os: string;
    browser: string;
    device: string;
  };
  compress?: boolean;
  large_threshold?: number;
  shard?: [number, number];
  presence?: any;
  intents: number;
}
