import { IsString, MinLength } from 'class-validator';

export class RequestLinkDto {
  @IsString()
  @MinLength(1)
  targetChannel!: string;

  @IsString()
  @MinLength(1)
  targetExternalId!: string;
}

export class ConfirmLinkDto {
  @IsString()
  @MinLength(6)
  code!: string;

  @IsString()
  @MinLength(1)
  channel!: string;

  @IsString()
  @MinLength(1)
  externalId!: string;
}
