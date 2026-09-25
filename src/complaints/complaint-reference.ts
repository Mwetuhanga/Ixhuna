import { randomInt } from 'node:crypto';

// No 0/O or 1/I/L, so a reference survives being read aloud or copied by hand.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Reference number given to the complainant, e.g. "7K3Q-9P2M". Random
 * rather than sequential, so it reveals nothing about complaint volumes and
 * can't be guessed to look up someone else's complaint.
 */
export function generateComplaintReference(): string {
  let chars = '';
  for (let i = 0; i < 8; i++) chars += ALPHABET[randomInt(ALPHABET.length)];
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/** What every channel tells the complainant once their complaint is filed. */
export function complaintReceivedMessage(reference: string): string {
  return (
    `Thank you. We have received your complaint and passed it on to the team responsible. ` +
    `Your reference number is ${reference}. Please keep it for any follow-up.`
  );
}
