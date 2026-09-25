import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Conversation, HandoverState, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { ChannelRegistryService } from '../channels/channel-registry.service';
import { IncomingMessage } from '../channels/channel.types';
import { NotificationsService } from '../notifications/notifications.service';
import { AgentsRealtimeGateway } from '../realtime/agents-realtime.gateway';
import { ComplaintIntakeService } from '../complaints/complaint-intake.service';
import { complaintReceivedMessage } from '../complaints/complaint-reference';
import { advanceFlow, createFlowState, greeting, FlowState } from './conversation-flow';

const HANDOVER_KEYWORDS = ['agent', 'human', 'representative'];

@Injectable()
export class ConversationEngineService {
  private readonly logger = new Logger(ConversationEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly channels: ChannelRegistryService,
    private readonly notifications: NotificationsService,
    private readonly realtime: AgentsRealtimeGateway,
    private readonly intake: ComplaintIntakeService
  ) {}

  /**
   * Single entry point every channel adapter calls with an inbound message.
   * Everything downstream (customer identity, conversation history,
   * complaint flow, handover) is completely channel-agnostic from here.
   */
  async handleIncoming(incoming: IncomingMessage): Promise<void> {
    const customer = await this.customers.findOrCreateByChannelIdentity(
      incoming.channel,
      incoming.externalId
    );

    let conversation = await this.prisma.conversation.findFirst({
      where: { customerId: customer.id, status: { not: 'CLOSED' } },
      orderBy: { createdAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { customerId: customer.id },
      });
    }

    const inboundMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        channel: incoming.channel,
        direction: 'INBOUND',
        senderType: 'CUSTOMER',
        body: incoming.text,
        externalId: incoming.externalMessageId,
      },
    });
    this.realtime.broadcast('message.created', { conversationId: conversation.id, message: inboundMessage });

    if (conversation.handoverState === 'HUMAN') {
      // A human already owns this conversation — the bot stays silent and
      // just made sure the dashboard saw the new message above.
      return;
    }

    if (HANDOVER_KEYWORDS.includes(incoming.text.trim().toLowerCase())) {
      await this.requestHandover(conversation, incoming, 'Customer asked for a human agent.');
      return;
    }

    await this.runBotTurn(conversation, incoming);
  }

  private async runBotTurn(conversation: Conversation, incoming: IncomingMessage): Promise<void> {
    if (!conversation.flowState) {
      await this.sendReply(conversation, incoming.channel, incoming.externalId, 'BOT', greeting());
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { flowState: createFlowState() as unknown as Prisma.InputJsonValue },
      });
      return;
    }

    const currentState = conversation.flowState as unknown as FlowState;
    const result = advanceFlow(currentState, incoming.text);

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { flowState: result.state as unknown as Prisma.InputJsonValue },
    });

    if (result.completedDraft) {
      const complaint = await this.intake.submit({
        channel: incoming.channel,
        customerId: conversation.customerId,
        conversationId: conversation.id,
        category: result.completedDraft.category,
        description: result.completedDraft.description,
        contact: result.completedDraft.contact,
      });

      await this.sendReply(
        conversation,
        incoming.channel,
        incoming.externalId,
        'BOT',
        complaintReceivedMessage(complaint.reference)
      );
      return;
    }

    if (result.reply) {
      await this.sendReply(conversation, incoming.channel, incoming.externalId, 'BOT', result.reply);
    }
  }

  private async requestHandover(
    conversation: Conversation,
    incoming: IncomingMessage,
    reason: string
  ): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { handoverState: 'HUMAN', status: 'PENDING' },
    });

    await this.notifications.enqueue({
      type: 'handover-requested',
      conversationId: conversation.id,
      channel: incoming.channel,
      reason,
    });
    this.realtime.broadcast('conversation.handover', {
      conversationId: conversation.id,
      handoverState: 'HUMAN' as HandoverState,
    });

    await this.sendReply(
      conversation,
      incoming.channel,
      incoming.externalId,
      'BOT',
      "I've flagged this conversation for a member of our team — they'll be with you shortly."
    );
  }

  /** Used by the agent dashboard to send a reply once a human owns the conversation. */
  async sendAgentReply(conversationId: string, text: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found.');

    const lastMessage = await this.prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    });
    if (!lastMessage) throw new NotFoundException('Conversation has no messages yet.');

    const identity = await this.prisma.customerIdentity.findFirst({
      where: { customerId: conversation.customerId, channel: lastMessage.channel },
    });
    if (!identity) throw new NotFoundException('No channel identity to reply to.');

    await this.sendReply(conversation, lastMessage.channel, identity.externalId, 'AGENT', text);
  }

  /** Toggle who owns replying: a human agent, or hand it back to the bot. */
  async setHandoverState(
    conversationId: string,
    handoverState: HandoverState,
    assignedAgentId: string | null
  ): Promise<Conversation> {
    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        handoverState,
        assignedAgentId,
        status: handoverState === 'HUMAN' ? 'PENDING' : 'OPEN',
      },
    });
    this.realtime.broadcast('conversation.handover', { conversationId, handoverState });
    return conversation;
  }

  private async sendReply(
    conversation: Conversation,
    channel: string,
    externalId: string,
    senderType: 'BOT' | 'AGENT',
    text: string
  ): Promise<void> {
    try {
      await this.channels.get(channel).sendMessage(externalId, text);
    } catch (err) {
      this.logger.error(`Failed to send outbound message on channel "${channel}"`, err as Error);
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        channel,
        direction: 'OUTBOUND',
        senderType,
        body: text,
      },
    });
    this.realtime.broadcast('message.created', { conversationId: conversation.id, message });
  }
}
