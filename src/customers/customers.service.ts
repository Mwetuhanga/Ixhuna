import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { Customer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const LINK_CODE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The core of cross-channel identity: looks up the Customer already
   * linked to this (channel, externalId) pair, or creates a brand new
   * Customer + identity if this is the first time we've seen them.
   */
  async findOrCreateByChannelIdentity(channel: string, externalId: string): Promise<Customer> {
    const identity = await this.prisma.customerIdentity.findUnique({
      where: { channel_externalId: { channel, externalId } },
      include: { customer: true },
    });
    if (identity) {
      return identity.customer;
    }

    return this.prisma.customer.create({
      data: {
        identities: {
          create: { channel, externalId },
        },
      },
    });
  }

  /**
   * Step 1 of linking a new channel to an existing, already-identified
   * customer: generate a short code the customer must relay back on the
   * new channel. In production this code would be sent over email/SMS/etc
   * by the caller (see NotificationsService) — this method only issues it.
   */
  async requestLink(customerId: string, targetChannel: string, targetExternalId: string) {
    const existing = await this.prisma.customerIdentity.findUnique({
      where: { channel_externalId: { channel: targetChannel, externalId: targetExternalId } },
    });
    if (existing && existing.customerId !== customerId) {
      throw new BadRequestException(
        'That identity is already linked to a different customer; merging is not supported.'
      );
    }

    const code = randomInt(100000, 999999).toString();
    await this.prisma.linkRequest.create({
      data: {
        customerId,
        code,
        channel: targetChannel,
        externalId: targetExternalId,
        expiresAt: new Date(Date.now() + LINK_CODE_TTL_MS),
      },
    });
    return { code, expiresInSeconds: LINK_CODE_TTL_MS / 1000 };
  }

  /**
   * Step 2: the customer sends the code back in on the new channel. If it
   * matches an unexpired, unconsumed request, the new (channel, externalId)
   * pair is attached to the original customer.
   */
  async confirmLink(code: string, channel: string, externalId: string): Promise<Customer> {
    const request = await this.prisma.linkRequest.findFirst({
      where: { code, channel, externalId, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!request) {
      throw new NotFoundException('Invalid or expired link code.');
    }

    await this.prisma.$transaction([
      this.prisma.linkRequest.update({
        where: { id: request.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.customerIdentity.upsert({
        where: { channel_externalId: { channel, externalId } },
        create: { channel, externalId, customerId: request.customerId },
        update: { customerId: request.customerId },
      }),
    ]);

    return this.prisma.customer.findUniqueOrThrow({ where: { id: request.customerId } });
  }

  findById(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: { identities: true },
    });
  }

  list() {
    return this.prisma.customer.findMany({
      include: { identities: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
