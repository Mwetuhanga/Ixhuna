import { Body, Controller, Get, HttpException, HttpStatus, Logger, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { COMPLAINT_CATEGORIES, COMPLAINT_LANGUAGES } from '../../complaints/complaint-options';
import { WebFormComplaintDto } from './web-form.dto';
import { WebFormService } from './web-form.service';
import { RateLimiterService } from './rate-limiter.service';

// Public (no login) endpoints behind the website complaint form at
// /complaint. Only accepts complaints and returns the ticket number; it
// never exposes existing complaints.
@Controller('public/complaints')
export class WebFormController {
  private readonly logger = new Logger(WebFormController.name);

  constructor(
    private readonly webForm: WebFormService,
    private readonly rateLimiter: RateLimiterService
  ) {}

  /** Choices the form offers, so the page and the validation never drift apart. */
  @Get('options')
  options() {
    return { categories: COMPLAINT_CATEGORIES, languages: COMPLAINT_LANGUAGES };
  }

  @Post()
  async submit(@Body() dto: WebFormComplaintDto, @Req() req: Request) {
    if (dto.website) {
      // Honeypot filled in: answer like a success so the bot moves on.
      this.logger.warn(`Dropped web form submission from ${req.ip}: honeypot field filled`);
      return { received: true };
    }

    const allowed = await this.rateLimiter.allow(
      `web-form:${req.ip}`,
      Number(process.env.WEB_FORM_RATE_LIMIT ?? 10),
      Number(process.env.WEB_FORM_RATE_WINDOW_SECONDS ?? 600)
    );
    if (!allowed) {
      throw new HttpException(
        'Too many complaints have been sent from your connection. Please try again in a few minutes.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const complaint = await this.webForm.submit(dto);
    return { received: true, ticket: complaint.ticket };
  }
}
