import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface AgentJwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async login(email: string, password: string) {
    const agent = await this.prisma.agent.findUnique({ where: { email } });
    if (!agent || !(await bcrypt.compare(password, agent.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload: AgentJwtPayload = { sub: agent.id, email: agent.email, role: agent.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      agent: { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
    };
  }
}
