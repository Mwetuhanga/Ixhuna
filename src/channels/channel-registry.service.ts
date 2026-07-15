import { Injectable } from '@nestjs/common';
import { ChannelAdapter } from './channel.types';

// Adapters register themselves here on module init; the conversation engine
// looks up "whichever channel this conversation is currently on" through
// this registry instead of depending on concrete adapter classes.
@Injectable()
export class ChannelRegistryService {
  private readonly adapters = new Map<string, ChannelAdapter>();

  register(adapter: ChannelAdapter) {
    this.adapters.set(adapter.channel, adapter);
  }

  get(channel: string): ChannelAdapter {
    const adapter = this.adapters.get(channel);
    if (!adapter) {
      throw new Error(`No channel adapter registered for "${channel}"`);
    }
    return adapter;
  }
}
