import { PrismaClient } from "@prisma/client";

export async function seedTaxes(prisma: PrismaClient) {
  console.log("Seeding Taxes...");

  const taxId = "tax-ppn-11-00000000-0000-0000-0000-000000000001";
  const tax = await prisma.tax.upsert({
    where: { id: taxId },
    update: {
      name: "PPN 11%",
      percentage: 11.00,
      isActive: true,
    },
    create: {
      id: taxId,
      name: "PPN 11%",
      percentage: 11.00,
      isActive: true,
    },
  });

  console.log(`Seeded tax: ${tax.name} (${tax.percentage}%)`);
  return tax;
}
