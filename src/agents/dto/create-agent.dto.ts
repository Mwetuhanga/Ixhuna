import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { AgentRole } from '@prisma/client';

export class CreateAgentDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @MinLength(8)
  password!: string;

  @IsEnum(AgentRole)
  role!: AgentRole;
}
