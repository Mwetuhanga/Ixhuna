import { Prisma } from '@prisma/client';
import { ComplaintIntakeService } from '../src/complaints/complaint-intake.service';

function setup(enqueue: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
  const create = jest.fn(async ({ data }) => ({ id: 'complaint-1', status: 'OPEN', ...data }));
  const broadcast = jest.fn();
  const service = new ComplaintIntakeService(
    { complaint: { create } } as any,
    { enqueue } as any,
    { broadcast } as any
  );
  return { service, create, enqueue, broadcast };
}

const submission = {
  channel: 'web-form',
  customerId: 'customer-1',
  category: 'billing',
  description: 'I was charged twice this month.',
  contact: '+264812345678',
};

describe('ComplaintIntakeService', () => {
  it('saves the complaint with a reference, notifies staff and updates the dashboard', async () => {
    const { service, create, enqueue, broadcast } = setup();

    const complaint = await service.submit({ ...submission, language: 'af' });

    expect(create).toHaveBeenCalledWith({
      data: {
        reference: expect.stringMatching(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/),
        channel: 'web-form',
        customerId: 'customer-1',
        conversationId: null,
        category: 'billing',
        description: 'I was charged twice this month.',
        contact: '+264812345678',
        language: 'af',
      },
    });
    expect(broadcast).toHaveBeenCalledWith('complaint.created', complaint);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'new-complaint', reference: complaint.reference, channel: 'web-form' })
    );
  });

  it('queues a receipt when the complainant gave an email', async () => {
    const { service, enqueue } = setup();

    const complaint = await service.submit({ ...submission, receiptEmail: 'maria@example.com' });

    expect(enqueue).toHaveBeenCalledWith({
      type: 'complaint-receipt',
      to: 'maria@example.com',
      reference: complaint.reference,
      category: 'billing',
    });
  });

  it('retries with a new reference if one is already taken', async () => {
    const { service, create } = setup();
    const taken = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });
    create.mockRejectedValueOnce(taken);

    await service.submit(submission);

    expect(create).toHaveBeenCalledTimes(2);
  });

  it('still returns the saved complaint when notifications cannot be queued', async () => {
    const { service } = setup(jest.fn().mockRejectedValue(new Error('Redis down')));

    await expect(service.submit(submission)).resolves.toMatchObject({ reference: expect.any(String) });
  });
});
