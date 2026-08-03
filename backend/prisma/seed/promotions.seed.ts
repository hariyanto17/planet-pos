import { PrismaClient, PromotionType } from "@prisma/client";

export async function seedPromotions(prisma: PrismaClient) {
  console.log("Seeding Promotions...");

  const adminUser = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!adminUser) {
    throw new Error("Admin user not found for seeding promotions.");
  }

  // Get products to link to package promotions
  const saltedPopcorn = await prisma.product.findUnique({ where: { sku: "FG-SALT-POP" } });
  const largeCola = await prisma.product.findUnique({ where: { sku: "FG-COLA-LG" } });

  if (!saltedPopcorn || !largeCola) {
    throw new Error("Required products for promotions not found.");
  }

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  // Define promotions
  const promotionsData = [
    {
      id: "promo-10pct-00000000-0000-0000-0000-000000000001",
      name: "10% Discount",
      type: PromotionType.PERCENT,
      percentValue: 10.00,
      packagePrice: null,
      priority: 1,
      stackable: true,
      startDate,
      endDate,
      items: [],
    },
    {
      id: "promo-wknd-00000000-0000-0000-0000-000000000002",
      name: "Weekend Promo",
      type: PromotionType.PERCENT,
      percentValue: 15.00,
      packagePrice: null,
      priority: 2,
      stackable: false,
      startDate,
      endDate,
      items: [],
    },
    {
      id: "promo-b2g1-00000000-0000-0000-0000-000000000003",
      name: "Buy 2 Get 1 Salted Popcorn",
      type: PromotionType.PACKAGE,
      percentValue: null,
      packagePrice: 90000.00, // 2 * 45,000
      priority: 3,
      stackable: false,
      startDate,
      endDate,
      items: [
        { productId: saltedPopcorn.id, quantity: 3 },
      ],
    },
    {
      id: "promo-combo-00000000-0000-0000-0000-000000000004",
      name: "Combo Promotion (Popcorn + Cola)",
      type: PromotionType.PACKAGE,
      percentValue: null,
      packagePrice: 60000.00, // Normal total: 45,000 + 25,000 = 70,000
      priority: 4,
      stackable: false,
      startDate,
      endDate,
      items: [
        { productId: saltedPopcorn.id, quantity: 1 },
        { productId: largeCola.id, quantity: 1 },
      ],
    },
  ];

  const seededPromotions = [];
  for (const promo of promotionsData) {
    const promotion = await prisma.promotion.upsert({
      where: { id: promo.id },
      update: {
        name: promo.name,
        type: promo.type,
        percentValue: promo.percentValue,
        packagePrice: promo.packagePrice,
        priority: promo.priority,
        stackable: promo.stackable,
        startDate: promo.startDate,
        endDate: promo.endDate,
        isActive: true,
        createdById: adminUser.id,
      },
      create: {
        id: promo.id,
        name: promo.name,
        type: promo.type,
        percentValue: promo.percentValue,
        packagePrice: promo.packagePrice,
        priority: promo.priority,
        stackable: promo.stackable,
        startDate: promo.startDate,
        endDate: promo.endDate,
        isActive: true,
        createdById: adminUser.id,
      },
    });

    // Remove existing promotion items before recreation
    await prisma.promotionItem.deleteMany({
      where: { promotionId: promotion.id },
    });

    // Seed promotion items
    for (const item of promo.items) {
      await prisma.promotionItem.create({
        data: {
          promotionId: promotion.id,
          productId: item.productId,
          quantity: item.quantity,
        },
      });
    }

    seededPromotions.push(promotion);
  }

  console.log(`Seeded ${seededPromotions.length} promotions successfully.`);
  return seededPromotions;
}
