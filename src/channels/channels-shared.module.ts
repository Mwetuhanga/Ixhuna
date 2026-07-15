import { Global, Module } from '@nestjs/common';
import { ChannelRegistryService } from './channel-registry.service';

// Split out from ChannelsModule so ConversationsModule can depend on the
// registry without creating a circular import (ChannelsModule itself
// depends on ConversationsModule to reach the engine).
@Global()
@Module({
  providers: [ChannelRegistryService],
  exports: [ChannelRegistryService],
})
export class ChannelsSharedModule {}
