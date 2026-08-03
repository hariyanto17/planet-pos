import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

export async function seedUsers(prisma: PrismaClient) {
  console.log("Seeding Users...");

  const defaultPassword = "test1234";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const usersToSeed = [
    { username: "admin", fullName: "System Admin", role: UserRole.ADMIN },
    { username: "accounting", fullName: "Accounting Officer", role: UserRole.ACCOUNTING },
    { username: "warehouse", fullName: "Warehouse Officer", role: UserRole.WAREHOUSE },
    { username: "cashier1", fullName: "Cashier One", role: UserRole.CASHIER },
    { username: "cashier2", fullName: "Cashier Two", role: UserRole.CASHIER },
    { username: "kitchen1", fullName: "Kitchen Cook One", role: UserRole.KITCHEN },
    { username: "kitchen2", fullName: "Kitchen Cook Two", role: UserRole.KITCHEN },
  ];

  const seededUsers = [];
  for (const u of usersToSeed) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        fullName: u.fullName,
        passwordHash,
        role: u.role,
        isActive: true,
      },
      create: {
        username: u.username,
        fullName: u.fullName,
        passwordHash,
        role: u.role,
        isActive: true,
      },
    });
    seededUsers.push(user);
  }

  console.log(`Seeded ${seededUsers.length} users successfully.`);
  return seededUsers;
}
