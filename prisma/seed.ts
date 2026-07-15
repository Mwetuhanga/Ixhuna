import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  const name = process.env.ADMIN_SEED_NAME ?? 'Admin';

  if (!email || !password) {
    throw new Error('Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD before running the seed script.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const agent = await prisma.agent.upsert({
    where: { email },
    update: { passwordHash, name, role: 'ADMIN' },
    create: { email, passwordHash, name, role: 'ADMIN' },
  });

  console.log(`Seeded admin agent: ${agent.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
