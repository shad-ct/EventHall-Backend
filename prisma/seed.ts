import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Hackathon', slug: 'hackathon', description: 'Coding competitions and hackathons' },
  { name: 'Quiz', slug: 'quiz', description: 'Quiz competitions and trivia events' },
  { name: 'Treasure Hunt', slug: 'treasure-hunt', description: 'Adventure and treasure hunt events' },
  { name: 'Idea Pitching', slug: 'idea-pitching', description: 'Startup and business idea competitions' },
  { name: 'Seminar', slug: 'seminar', description: 'Educational seminars and talks' },
  { name: 'Workshop', slug: 'workshop', description: 'Hands-on workshops and training sessions' },
  { name: 'Cultural Event', slug: 'cultural-event', description: 'Cultural programs and performances' },
  { name: 'Sports', slug: 'sports', description: 'Sports tournaments and athletic events' },
  { name: 'Technical Talk', slug: 'technical-talk', description: 'Tech talks and guest lectures' },
  { name: 'Competition', slug: 'competition', description: 'General competitions' },
  { name: 'Fest', slug: 'fest', description: 'College fests and celebrations' },
  { name: 'Conference', slug: 'conference', description: 'Academic and professional conferences' },
];

async function main() {
  console.log('🌱 Seeding database...');

  for (const category of categories) {
    await prisma.eventCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
    console.log(`✅ Created/Updated category: ${category.name}`);
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
