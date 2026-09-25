import { ComplaintIntakeService } from '../src/complaints/complaint-intake.service';

function setup(enqueue: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
  const create = jest.fn(async ({ data }) => ({ id: 'complaint-1', ticket: 42, status: 'OPEN', ...data }));
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
  it('saves the complaint, notifies staff and updates the dashboard', async () => {
    const { service, create, enqueue, broadcast } = setup();

    const complaint = await service.submit({ ...submission, language: 'af' });

    expect(create).toHaveBeenCalledWith({
      data: {
        channel: 'web-form',
        customerId: 'customer-1',
        conversationId: null,
        category: 'billing',
        description: 'I was charged twice this month.',
        contact: '+264812345678',
        language: 'af',
      },
    });
    expect(complaint.ticket).toBe(42);
    expect(broadcast).toHaveBeenCalledWith('complaint.created', complaint);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: 'new-complaint', ticket: 42, channel: 'web-form' }));
  });

  it('queues a receipt when the complainant gave an email', async () => {
    const { service, enqueue } = setup();

    await service.submit({ ...submission, receiptEmail: 'maria@example.com' });

    expect(enqueue).toHaveBeenCalledWith({
      type: 'complaint-receipt',
      to: 'maria@example.com',
      ticket: 42,
      category: 'billing',
    });
  });

  it('still returns the saved complaint when notifications cannot be queued', async () => {
    const { service } = setup(jest.fn().mockRejectedValue(new Error('Redis down')));

    await expect(service.submit(submission)).resolves.toMatchObject({ ticket: 42 });
  });
});
