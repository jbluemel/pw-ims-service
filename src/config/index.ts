// Single source of truth for environment-driven config (12-factor).
// Read env here, nowhere else, so the rest of the code depends on `config`.

export interface Config {
  port: number;
  nodeEnv: string;
  shutdownTimeoutMs: number;
}

export const config: Config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  shutdownTimeoutMs: Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10000),
};
