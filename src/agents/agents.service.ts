import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.agent.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateAgentDto) {
    const existing = await this.prisma.agent.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An agent with that email already exists.');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const agent = await this.prisma.agent.create({
      data: { email: dto.email, name: dto.name, role: dto.role, passwordHash },
    });
    return { id: agent.id, email: agent.email, name: agent.name, role: agent.role };
  }
}
