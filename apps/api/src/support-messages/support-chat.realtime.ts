import { Injectable } from '@nestjs/common';
import type { SupportChatRealtimeEvent } from '@itmarket/contracts';
import { RedisService } from '../infrastructure/redis/redis.service';

const THREAD_CHANNEL_PREFIX = 'support-chat:thread:';
const INBOX_CHANNEL = 'support-chat:inbox';

@Injectable()
export class SupportChatRealtimeService {
  constructor(private readonly redis: RedisService) {}

  threadChannel(threadId: string): string {
    return `${THREAD_CHANNEL_PREFIX}${threadId}`;
  }

  async publish(event: SupportChatRealtimeEvent): Promise<void> {
    const payload = JSON.stringify(event);
    await Promise.all([
      this.redis.publish(this.threadChannel(event.threadId), payload),
      this.redis.publish(INBOX_CHANNEL, payload),
    ]);
  }

  async subscribeThread(
    threadId: string,
    handler: (event: SupportChatRealtimeEvent) => void,
  ): Promise<() => Promise<void>> {
    return this.redis.subscribe(this.threadChannel(threadId), (raw) => {
      const event = parseEvent(raw);
      if (event !== null) {
        handler(event);
      }
    });
  }

  async subscribeInbox(
    handler: (event: SupportChatRealtimeEvent) => void,
  ): Promise<() => Promise<void>> {
    return this.redis.subscribe(INBOX_CHANNEL, (raw) => {
      const event = parseEvent(raw);
      if (event !== null) {
        handler(event);
      }
    });
  }
}

function parseEvent(raw: string): SupportChatRealtimeEvent | null {
  try {
    const value = JSON.parse(raw) as SupportChatRealtimeEvent;
    if (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      'threadId' in value
    ) {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}
