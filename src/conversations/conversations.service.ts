import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.conversation.findMany({
      include: {
        customer: true,
        assignedAgent: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  getWithMessages(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: { include: { identities: true } },
        assignedAgent: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
        complaints: true,
      },
    });
  }

  listComplaints() {
    return this.prisma.complaint.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
