const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminHash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  // Existing test user
  const userHash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      passwordHash: userHash,
      role: 'USER',
    },
  });

  // New employees - password is their own name
  const employees = ['Saeed', 'Rafi', 'Anel', 'Viktor', 'Senaid', 'Mustafa'];
  
  for (const name of employees) {
    const hash = await bcrypt.hash(name, 10);
    await prisma.user.upsert({
      where: { username: name },
      update: {},
      create: {
        username: name,
        passwordHash: hash,
        role: 'USER',
      },
    });
  }

  console.log('Seeded users:');
  console.log('  admin (password: password123)');
  console.log('  user (password: password123)');
  console.log('  Saeed, Rafi, Anel, Viktor, Senaid, Mustafa (password: eigener Name)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
