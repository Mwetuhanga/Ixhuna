import { complaintReceivedMessage, generateComplaintReference } from '../src/complaints/complaint-reference';

describe('generateComplaintReference', () => {
  it('produces readable XXXX-XXXX references without look-alike characters', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateComplaintReference()).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    }
  });

  it('is random rather than sequential', () => {
    const references = new Set(Array.from({ length: 200 }, generateComplaintReference));
    expect(references.size).toBe(200);
  });
});

describe('complaintReceivedMessage', () => {
  it('confirms receipt, routing and the reference', () => {
    expect(complaintReceivedMessage('7K3Q-9P2M')).toBe(
      'Thank you. We have received your complaint and passed it on to the team responsible. ' +
        'Your reference number is 7K3Q-9P2M. Please keep it for any follow-up.'
    );
  });
});
