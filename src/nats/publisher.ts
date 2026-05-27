import { getNats } from './client';
import { StringCodec } from 'nats';

const sc = StringCodec();

interface ItemEvent {
  eventType: 'ITEM_CREATED' | 'ITEM_UPDATED' | 'ITEM_PUBLISHED' | 'ITEM_UNPUBLISHED';
  source: 'IMS';
  timestamp: string;
  data: Record<string, unknown>;
}

export function publishItemEvent(eventType: ItemEvent['eventType'], data: Record<string, unknown>) {
  const nc = getNats();
  
  const event: ItemEvent = {
    eventType,
    source: 'IMS',
    timestamp: new Date().toISOString(),
    data
  };

  const subject = `pw.item.${eventType.toLowerCase()}`;
  nc.publish(subject, sc.encode(JSON.stringify(event)));
  console.log(`Published ${eventType} to ${subject}`);
}