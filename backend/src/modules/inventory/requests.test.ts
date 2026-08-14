import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import {
  createStockRequest,
  claimStockRequest,
  shipStockRequest,
  receiveStockRequest,
  acceptStockRequest,
} from "./requests.service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test("Stock request fulfillment uses materialVariant-based stock tracking", async (t) => {
  const whMain = await prisma.warehouse.findFirst({ where: { code: "WH_MAIN_TEST" } }) || await prisma.warehouse.create({
    data: { code: "WH_MAIN_TEST", name: "Main Warehouse Test", warehouseType: "SALES", isActive: true },
  });

  const whKitchen = await prisma.warehouse.findFirst({ where: { code: "WH_KITCHEN_TEST" } }) || await prisma.warehouse.create({
    data: { code: "WH_KITCHEN_TEST", name: "Kitchen Storage Test", warehouseType: "KITCHEN_STORAGE", isActive: true },
  });

  const userA = await prisma.user.findFirst({ where: { role: "ADMIN" } }) || await prisma.user.create({
    data: {
      username: `admin-stockreq-${Date.now()}`,
      passwordHash: "hashed",
      fullName: "Admin Stock Request",
      role: "ADMIN",
      isActive: true,
    },
  });

  const userB = await prisma.user.findFirst({ where: { role: "WAREHOUSE" } }) || await prisma.user.create({
    data: {
      username: `warehouse-stockreq-${Date.now()}`,
      passwordHash: "hashed",
      fullName: "Warehouse Stock Request",
      role: "WAREHOUSE",
      warehouseId: whMain.id,
      isActive: true,
    },
  });

  const material = await prisma.material.create({
    data: { name: "Sugar Request Test" },
  });

  const variant = await prisma.materialVariant.create({
    data: {
      materialId: material.id,
      name: "Sugar Request Test",
      baseUnit: "G",
      sku: `REQ-${Date.now()}`,
    },
  });

  await prisma.inventoryStock.createMany({
    data: [
      { warehouseId: whMain.id, materialVariantId: variant.id, quantity: new Decimal(10000) },
      { warehouseId: whKitchen.id, materialVariantId: variant.id, quantity: new Decimal(0) },
    ],
  });

  await t.test("Create -> Claim -> Ship -> Receive -> Accept flow", async () => {
    const req = await createStockRequest(
      userB!.id,
      whKitchen.id,
      "WAREHOUSE",
      whKitchen.id,
      [{ materialVariantId: variant.id, quantity: 4, unit: "KG" }],
      "Urgent request"
    );

    assert.ok(req);
    assert.equal(req.status, "PENDING");
    assert.equal(req.items.length, 1);
    assert.equal(Number(req.items[0].quantity), 4000);

    const mainStock1 = await prisma.inventoryStock.findUnique({
      where: { warehouseId_materialVariantId: { warehouseId: whMain.id, materialVariantId: variant.id } },
    });
    const kitchenStock1 = await prisma.inventoryStock.findUnique({
      where: { warehouseId_materialVariantId: { warehouseId: whKitchen.id, materialVariantId: variant.id } },
    });
    assert.equal(Number(mainStock1?.quantity), 10000);
    assert.equal(Number(kitchenStock1?.quantity), 0);

    const claimed = await claimStockRequest(userA!.id, whMain.id, "ADMIN", req.id, whMain.id);
    assert.equal(claimed.status, "FULFILLING");
    assert.equal(claimed.sourceWarehouseId, whMain.id);

    await assert.rejects(
      claimStockRequest(userA!.id, whMain.id, "ADMIN", req.id, whMain.id),
      /already been claimed|already claimed|handled/i
    );

    const mainStock2 = await prisma.inventoryStock.findUnique({
      where: { warehouseId_materialVariantId: { warehouseId: whMain.id, materialVariantId: variant.id } },
    });
    assert.equal(Number(mainStock2?.quantity), 10000);

    const shipped = await shipStockRequest(userA!.id, req.id);
    assert.equal(shipped.status, "SHIPPED");

    const mainStock3 = await prisma.inventoryStock.findUnique({
      where: { warehouseId_materialVariantId: { warehouseId: whMain.id, materialVariantId: variant.id } },
    });
    const kitchenStock3 = await prisma.inventoryStock.findUnique({
      where: { warehouseId_materialVariantId: { warehouseId: whKitchen.id, materialVariantId: variant.id } },
    });
    assert.equal(Number(mainStock3?.quantity), 6000);
    assert.equal(Number(kitchenStock3?.quantity), 0);

    const received = await receiveStockRequest(userB!.id, whKitchen.id, "WAREHOUSE", req.id);
    assert.equal(received.status, "RECEIVED");

    const kitchenStock4 = await prisma.inventoryStock.findUnique({
      where: { warehouseId_materialVariantId: { warehouseId: whKitchen.id, materialVariantId: variant.id } },
    });
    assert.equal(Number(kitchenStock4?.quantity), 0);

    const accepted = await acceptStockRequest(userB!.id, whKitchen.id, "WAREHOUSE", req.id);
    assert.equal(accepted.status, "ACCEPTED");

    const kitchenStock5 = await prisma.inventoryStock.findUnique({
      where: { warehouseId_materialVariantId: { warehouseId: whKitchen.id, materialVariantId: variant.id } },
    });
    assert.equal(Number(kitchenStock5?.quantity), 4000);
  });

  await prisma.inventoryStock.deleteMany({ where: { materialVariantId: variant.id } });
  await prisma.stockLedger.deleteMany({ where: { materialVariantId: variant.id } });
  await prisma.stockRequestItem.deleteMany({ where: { materialVariantId: variant.id } });
  await prisma.stockTransferItem.deleteMany({ where: { materialVariantId: variant.id } });
  await prisma.materialVariant.delete({ where: { id: variant.id } });
  await prisma.material.delete({ where: { id: material.id } });
});
