import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.complaint.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
