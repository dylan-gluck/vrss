import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: "postgresql://vrss_user:vrss_dev_password@localhost:6969/vrss?schema=public",
});

async function main() {
  // Clean up
  await prisma.friendship.deleteMany();
  await prisma.userFollow.deleteMany();
  await prisma.user.deleteMany({ where: { email: { contains: "triggertest" } } });

  // Create test users
  const user1 = await prisma.user.create({
    data: {
      username: "triggertest1",
      email: "triggertest1@example.com",
      passwordHash: "hash",
      emailVerified: false,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username: "triggertest2",
      email: "triggertest2@example.com",
      passwordHash: "hash",
      emailVerified: false,
    },
  });

  // Create first follow
  await prisma.userFollow.create({
    data: {
      followerId: user1.id,
      followingId: user2.id,
    },
  });

  console.log("✓ Created first follow (user1 -> user2)");

  // Check friendship (should be 0)
  const friendshipsBefore = await prisma.friendship.findMany();
  console.log(`  Friendships before mutual follow: ${friendshipsBefore.length}`);

  // Create second follow (mutual)
  await prisma.userFollow.create({
    data: {
      followerId: user2.id,
      followingId: user1.id,
    },
  });

  console.log("✓ Created second follow (user2 -> user1) - mutual!");

  // Check friendship (should be 1)
  const friendshipsAfter = await prisma.friendship.findMany();
  console.log(`  Friendships after mutual follow: ${friendshipsAfter.length}`);

  if (friendshipsAfter.length === 1) {
    console.log("✅ Trigger works! Friendship created automatically.");
    console.log("   Friendship:", {
      userId1: friendshipsAfter[0].userId1.toString(),
      userId2: friendshipsAfter[0].userId2.toString(),
    });
  } else {
    console.log("❌ Trigger did NOT work! No friendship created.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
