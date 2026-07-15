import { Body, Controller, Get, Inject, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { ConversationEngineService } from './conversation-engine.service';
import { ReplyDto, SetHandoverDto } from './dto/conversation.dto';
import { AI_PROVIDER } from '../ai/ai.constants';
import { AiProvider } from '../ai/ai.types';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly engine: ConversationEngineService,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider
  ) {}

  @Get()
  list() {
    return this.conversations.list();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const conversation = await this.conversations.getWithMessages(id);
    if (!conversation) throw new NotFoundException('Conversation not found.');
    return conversation;
  }

  @Post(':id/reply')
  async reply(@Param('id') id: string, @Body() dto: ReplyDto) {
    await this.engine.sendAgentReply(id, dto.text);
    return { ok: true };
  }

  @Post(':id/handover')
  setHandover(@Param('id') id: string, @Body() dto: SetHandoverDto) {
    return this.engine.setHandoverState(id, dto.handoverState, dto.assignedAgentId ?? null);
  }

  @Get(':id/suggested-reply')
  async suggestedReply(@Param('id') id: string) {
    const conversation = await this.conversations.getWithMessages(id);
    if (!conversation) throw new NotFoundException('Conversation not found.');

    const history = conversation.messages.map((m) => ({
      role: (m.senderType === 'CUSTOMER' ? 'customer' : m.senderType === 'AGENT' ? 'agent' : 'bot') as
        | 'customer'
        | 'agent'
        | 'bot',
      text: m.body,
    }));

    return { suggestion: await this.ai.suggestReply(history) };
  }
}
