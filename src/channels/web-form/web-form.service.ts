import { BadRequestException, Injectable } from '@nestjs/common';
import { Complaint } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomersService } from '../../customers/customers.service';
import { ComplaintIntakeService } from '../../complaints/complaint-intake.service';
import { WebFormComplaintDto } from './web-form.dto';
import { formatContact, normalizePhone } from './contact.util';

export const WEB_FORM_CHANNEL = 'web-form';

// Website complaint form. Unlike the chat channels there's no conversation:
// one submission is one complaint, filed straight through the intake
// service. There's also no way to reply on this channel, so the complainant
// must leave a phone number or email for follow-up.
@Injectable()
export class WebFormService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly intake: ComplaintIntakeService
  ) {}

  async submit(dto: WebFormComplaintDto): Promise<Complaint> {
    let phone: string | null = null;
    if (dto.phone) {
      phone = normalizePhone(dto.phone, process.env.DEFAULT_COUNTRY_CODE ?? '264');
      if (!phone) throw new BadRequestException('Please enter a valid phone number.');
    }
    const email = dto.email?.toLowerCase();
    if (!phone && !email) {
      throw new BadRequestException('Please give a phone number or email address so we can follow up.');
    }

    // Form contact details are unverified, so they get their own
    // "web-form" identity: repeat submissions from the same number group
    // under one customer, but are never attached to that number's WhatsApp
    // history (that still needs the verified link-code flow).
    const customer = await this.customers.findOrCreateByChannelIdentity(WEB_FORM_CHANNEL, phone ?? email!);
    if ((!customer.displayName && dto.name) || (!customer.email && email)) {
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          displayName: customer.displayName ?? dto.name,
          email: customer.email ?? email,
        },
      });
    }

    return this.intake.submit({
      channel: WEB_FORM_CHANNEL,
      customerId: customer.id,
      category: dto.category,
      description: dto.description,
      contact: formatContact({ name: dto.name, phone, email }),
      language: dto.language,
      receiptEmail: email,
    });
  }
}
