import { PrismaClient } from "@prisma/client";

export async function seedProductUnitConversions(prisma: PrismaClient) {
  console.log("Seeding Product Unit Conversions...");

  const conversionsToSeed: Array<{
    productName: string;
    unitSymbol: string;
    baseQuantity: number;
    isDefault?: boolean;
  }> = [
    // Raw Materials
    { productName: "Bubuk Teh", unitSymbol: "KG", baseQuantity: 1000, isDefault: true },
    { productName: "Bubuk Kopi", unitSymbol: "KG", baseQuantity: 1000, isDefault: true },
    { productName: "Kentang Frozen", unitSymbol: "KG", baseQuantity: 1000, isDefault: true },
    { productName: "Minyak Goreng", unitSymbol: "LITER", baseQuantity: 1000, isDefault: true },

    // Packaging
    { productName: "Cup Plastik 16 oz", unitSymbol: "PACK", baseQuantity: 50, isDefault: true },
    { productName: "Cup Plastik 16 oz", unitSymbol: "BOX", baseQuantity: 1000, isDefault: false },
    { productName: "Tutup Cup 16 oz", unitSymbol: "PACK", baseQuantity: 100, isDefault: true },
    { productName: "Tutup Cup 16 oz", unitSymbol: "BOX", baseQuantity: 2000, isDefault: false },

    // Finished Goods - bottled drinks
    { productName: "Air Mineral 600ml", unitSymbol: "BOTTLE", baseQuantity: 600, isDefault: true },
    { productName: "Air Mineral 1.500ml", unitSymbol: "BOTTLE", baseQuantity: 1500, isDefault: true },
  ];

  let seededCount = 0;

  for (const conv of conversionsToSeed) {
    const product = await prisma.product.findFirst({
      where: { name: conv.productName, deletedAt: null },
    });

    if (!product) {
      console.log(`  Skipping conversion for ${conv.productName}: product not found`);
      continue;
    }

    const unit = await prisma.unit.findUnique({
      where: { symbol: conv.unitSymbol },
    });

    if (!unit) {
      console.log(`  Skipping ${conv.productName} -> ${conv.unitSymbol}: unit not found`);
      continue;
    }

    const existing = await prisma.productUnitConversion.findFirst({
      where: { productId: product.id, unitId: unit.id },
    });

    if (existing) {
      await prisma.productUnitConversion.update({
        where: { id: existing.id },
        data: {
          baseQuantity: new (require("@prisma/client-runtime-utils").Decimal)(conv.baseQuantity),
          isDefault: conv.isDefault ?? false,
        },
      });
    } else {
      await prisma.productUnitConversion.create({
        data: {
          productId: product.id,
          unitId: unit.id,
          baseQuantity: new (require("@prisma/client-runtime-utils").Decimal)(conv.baseQuantity),
          isDefault: conv.isDefault ?? false,
        },
      });
    }

    seededCount++;
    console.log(`  Seeded conversion: ${conv.productName} -> ${conv.unitSymbol} = ${conv.baseQuantity}`);
  }

  console.log(`Seeded ${seededCount} product unit conversions successfully.`);
}
