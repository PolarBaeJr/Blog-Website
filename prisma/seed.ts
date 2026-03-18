import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Upsert default SiteSettings
  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      blogTitle: 'My Blog',
      blogDescription: 'Welcome to our blog',
      footerText: '',
    },
  });
  console.log('✅ SiteSettings created');

  // Create default tags
  const tags = ['General', 'Technology', 'Tutorial'];
  for (const tagName of tags) {
    await prisma.tag.upsert({
      where: { slug: tagName.toLowerCase() },
      update: {},
      create: {
        name: tagName,
        slug: tagName.toLowerCase(),
      },
    });
  }
  console.log('✅ Default tags created:', tags.join(', '));

  // Create default category
  await prisma.category.upsert({
    where: { slug: 'uncategorized' },
    update: {},
    create: {
      name: 'Uncategorized',
      slug: 'uncategorized',
    },
  });
  console.log('✅ Default category created: Uncategorized');

  // Create default admin user
  // ⚠️ IMPORTANT: Change this password immediately after first login!
  // This is a default seed password and MUST NOT be used in production.
  const SEED_ADMIN_PASSWORD = 'changeme';
  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      passwordHash,
    },
  });
  console.log('✅ Default admin user created (admin@example.com)');
  console.log('⚠️  Default password is "changeme" — change it immediately!');

  console.log('🌱 Seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
