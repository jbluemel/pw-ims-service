import { connect, NatsConnection } from 'nats';

let nc: NatsConnection | null = null;

export async function connectNats(): Promise<NatsConnection> {
  if (nc) return nc;
  
  const server = process.env.NATS_URL || 'nats://localhost:4222';
  nc = await connect({ servers: server });
  console.log(`Connected to NATS at ${server}`);
  return nc;
}

export function getNats(): NatsConnection {
  if (!nc) throw new Error('NATS not connected');
  return nc;
}

export async function closeNats(): Promise<void> {
  if (nc) {
    await nc.close();
    nc = null;
  }
}