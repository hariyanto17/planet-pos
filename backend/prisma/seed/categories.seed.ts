import { PrismaClient } from "@prisma/client";

export async function seedCategories(prisma: PrismaClient) {
  console.log("Seeding Categories...");

  const categoriesToSeed = [
    { id: "cat-popcorn-00000000-0000-0000-0000-000000000001", name: "Popcorn" },
    { id: "cat-beverage-000000-0000-0000-0000-000000000002", name: "Beverages" },
    { id: "cat-snack-00000000-0000-0000-0000-000000000003", name: "Snack" },
    { id: "cat-combo-00000000-0000-0000-0000-000000000004", name: "Combo" },
    { id: "cat-kitchen-00000000-0000-0000-0000-000000000005", name: "Kitchen" },
    { id: "cat-icecream-000000-0000-0000-0000-000000000006", name: "Ice Cream" },
  ];

  const seededCategories = [];
  for (const c of categoriesToSeed) {
    const category = await prisma.category.upsert({
      where: { id: c.id },
      update: { name: c.name, isActive: true },
      create: { id: c.id, name: c.name, isActive: true },
    });
    seededCategories.push(category);
  }

  console.log(`Seeded ${seededCategories.length} categories successfully.`);
  return seededCategories;
}
