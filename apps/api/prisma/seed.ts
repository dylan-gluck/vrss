/**
 * VRSS Social Platform - Database Seed Script
 * Seeds initial data for Phase 1: Foundation Tables
 *
 * Run with: bunx prisma db seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Seed Subscription Tiers
  console.log('📦 Seeding subscription tiers...');

  const tiers = [
    {
      name: 'Free',
      description: 'Free tier with basic features and 50MB storage',
      storageBytes: 50 * 1024 * 1024, // 50MB = 52,428,800 bytes
      priceMonthlyCents: 0,
      isActive: true,
    },
    {
      name: 'Basic',
      description: 'Basic tier with enhanced features and 1GB storage',
      storageBytes: 1 * 1024 * 1024 * 1024, // 1GB = 1,073,741,824 bytes
      priceMonthlyCents: 499, // $4.99/month
      isActive: true,
    },
    {
      name: 'Pro',
      description: 'Pro tier with advanced features and 5GB storage',
      storageBytes: 5 * 1024 * 1024 * 1024, // 5GB = 5,368,709,120 bytes
      priceMonthlyCents: 999, // $9.99/month
      isActive: true,
    },
    {
      name: 'Premium',
      description: 'Premium tier with all features and 10GB storage',
      storageBytes: 10 * 1024 * 1024 * 1024, // 10GB = 10,737,418,240 bytes
      priceMonthlyCents: 1999, // $19.99/month
      isActive: true,
    },
  ];

  for (const tier of tiers) {
    const created = await prisma.subscriptionTier.upsert({
      where: { name: tier.name },
      update: tier,
      create: tier,
    });
    console.log(`  ✓ ${created.name}: ${Number(created.storageBytes) / (1024 * 1024)}MB - $${created.priceMonthlyCents / 100}/month`);
  }

  console.log('\n✨ Database seed completed successfully!\n');
  console.log('Summary:');
  console.log(`  - ${tiers.length} subscription tiers created/updated`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
