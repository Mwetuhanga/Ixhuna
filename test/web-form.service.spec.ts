import { BadRequestException } from '@nestjs/common';
import { WebFormService } from '../src/channels/web-form/web-form.service';
import { WebFormComplaintDto } from '../src/channels/web-form/web-form.dto';

function setup(existingCustomer: { displayName: string | null; email: string | null } = { displayName: null, email: null }) {
  const customer = { id: 'customer-1', ...existingCustomer };
  const findOrCreateByChannelIdentity = jest.fn().mockResolvedValue(customer);
  const update = jest.fn().mockResolvedValue(customer);
  const submit = jest.fn(async (s) => ({ reference: 'ABCD-EFGH', ...s }));
  const service = new WebFormService(
    { customer: { update } } as any,
    { findOrCreateByChannelIdentity } as any,
    { submit } as any
  );
  return { service, findOrCreateByChannelIdentity, update, submit };
}

function dto(overrides: Partial<WebFormComplaintDto> = {}): WebFormComplaintDto {
  return {
    category: 'service_quality',
    description: 'No water in our street for three days.',
    consent: true,
    ...overrides,
  } as WebFormComplaintDto;
}

describe('WebFormService', () => {
  it('files the complaint under a web-form identity keyed on the normalized phone', async () => {
    const { service, findOrCreateByChannelIdentity, submit } = setup();

    await service.submit(dto({ name: 'Maria', phone: '081 234 5678', language: 'ng' }));

    expect(findOrCreateByChannelIdentity).toHaveBeenCalledWith('web-form', '264812345678');
    expect(submit).toHaveBeenCalledWith({
      channel: 'web-form',
      customerId: 'customer-1',
      category: 'service_quality',
      description: 'No water in our street for three days.',
      contact: 'Maria · +264812345678',
      language: 'ng',
      receiptEmail: undefined,
    });
  });

  it('falls back to the lowercased email as the identity and sends a receipt there', async () => {
    const { service, findOrCreateByChannelIdentity, submit } = setup();

    await service.submit(dto({ email: 'Maria@Example.com' }));

    expect(findOrCreateByChannelIdentity).toHaveBeenCalledWith('web-form', 'maria@example.com');
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ receiptEmail: 'maria@example.com' }));
  });

  it('fills in missing name/email on the customer but never overwrites them', async () => {
    const fresh = setup();
    await fresh.service.submit(dto({ name: 'Maria', email: 'maria@example.com' }));
    expect(fresh.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: { displayName: 'Maria', email: 'maria@example.com' },
    });

    const known = setup({ displayName: 'Maria N.', email: 'maria@example.com' });
    await known.service.submit(dto({ name: 'Someone else', email: 'maria@example.com' }));
    expect(known.update).not.toHaveBeenCalled();
  });

  it('requires a phone number or email', async () => {
    const { service, submit } = setup();
    await expect(service.submit(dto())).rejects.toBeInstanceOf(BadRequestException);
    expect(submit).not.toHaveBeenCalled();
  });

  it('rejects a phone number it cannot understand', async () => {
    const { service } = setup();
    await expect(service.submit(dto({ phone: 'call me' }))).rejects.toThrow('valid phone number');
  });
});
