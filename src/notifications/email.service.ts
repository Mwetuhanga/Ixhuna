import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter?: nodemailer.Transporter;

  private getTransporter(): nodemailer.Transporter | null {
    if (!process.env.SMTP_HOST) return null;
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    }
    return this.transporter;
  }

  async send(subject: string, text: string): Promise<void> {
    const to = process.env.NOTIFY_TO_EMAIL;
    const transporter = this.getTransporter();
    if (!transporter || !to) {
      this.logger.warn(`SMTP not configured; skipping email "${subject}"`);
      return;
    }

    await transporter.sendMail({ from: process.env.NOTIFY_FROM_EMAIL, to, subject, text });
  }
}
