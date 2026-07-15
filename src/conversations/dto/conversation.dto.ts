import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { HandoverState } from '@prisma/client';

export class ReplyDto {
  @IsString()
  @MinLength(1)
  text!: string;
}

export class SetHandoverDto {
  @IsEnum(HandoverState)
  handoverState!: HandoverState;

  @IsOptional()
  @IsString()
  assignedAgentId?: string;
}
