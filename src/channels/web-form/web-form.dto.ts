import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { COMPLAINT_CATEGORY_CODES, COMPLAINT_LANGUAGE_CODES } from '../../complaints/complaint-options';

// Browsers submit untouched optional inputs as "", which should count as
// "not provided" rather than fail e.g. the email check.
const trimToUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export class WebFormComplaintDto {
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  // At least one of phone or email is required; checked in WebFormService
  // along with normalizing the number.
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @Transform(trimToUndefined)
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsIn(COMPLAINT_CATEGORY_CODES)
  category!: string;

  @Transform(trimToUndefined)
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @Transform(trimToUndefined)
  @IsOptional()
  @IsIn(COMPLAINT_LANGUAGE_CODES)
  language?: string;

  @Equals(true, { message: 'You must agree to your details being used to handle this complaint.' })
  consent!: boolean;

  // Honeypot: the form hides this field from people, so only bots fill it.
  @IsOptional()
  @IsString()
  website?: string;
}
