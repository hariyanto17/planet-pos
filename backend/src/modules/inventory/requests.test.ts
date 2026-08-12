import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient, InventoryType, BaseUnit } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  createStockRequest,
  claimStockRequest,
  shipStockRequest,
  receiveStockRequest,
  acceptStockRequest,
  cancelStockRequest,
  getStockRequests,
} from "./requests.service";

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

test("Stock Request & Fulfillment Integration Tests", async (t) => {
  // Setup data
  const userA = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const userB = await prisma.user.findFirst({ where: { role: "WAREHOUSE" } });
  const category = await prisma.category.findFirst() || await prisma.category.create({
    data: { name: "Test Category" },
  });

  const unitKg = await prisma.unit.findFirst({ where: { symbol: "KG" } }) || await prisma.unit.create({
    data: { name: "Kilogram", symbol: "KG" },
  });

  const whMain = await prisma.warehouse.findFirst({ where: { code: "WH_MAIN_TEST" } }) || await prisma.warehouse.create({
    data: { code: "WH_MAIN_TEST", name: "Main Warehouse Test", warehouseType: "SALES", isActive: true },
  });

  const whKitchen = await prisma.warehouse.findFirst({ where: { code: "WH_KITCHEN_TEST" } }) || await prisma.warehouse.create({
    data: { code: "WH_KITCHEN_TEST", name: "Kitchen Storage Test", warehouseType: "KITCHEN_STORAGE", isActive: true },
  });

  const sugar = await prisma.product.create({
    data: {
      name: "Sugar Request Test",
      categoryId: category.id,
      inventoryType: InventoryType.RAW_MATERIAL,
      trackInventory: true,
      price: new Decimal(20000),
      unitId: unitKg.id,
      baseUnit: BaseUnit.G,
    },
  });

  // Setup initial stock: Main = 10,000 G (10 KG), Kitchen = 0
  await prisma.warehouseStock.createMany({
    data: [
      { warehouseId: whMain.id, productId: sugar.id, quantity: new Decimal(10000) },
      { warehouseId: whKitchen.id, productId: sugar.id, quantity: new Decimal(0) },
    ],
  });

  await t.test("Workflow: Create -> Claim -> Ship -> Receive -> Accept", async () => {
    // 1. Create request: Kitchen requests 4 KG Sugar (input 4 KG -> 4000 G baseUnit)
    const req = await createStockRequest(
      userB!.id,
      whKitchen.id,
      "WAREHOUSE",
      whKitchen.id,
      [{ productId: sugar.id, quantity: 4, unit: "KG" }],
      "Urgent request"
    );

    assert.ok(req);
    assert.equal(req.status, "PENDING");
    assert.equal(req.items.length, 1);
    assert.equal(Number(req.items[0].quantity), 4000); // 4 KG converted to 4000 G

    // Verify stock is unchanged
    const mainStock1 = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId: whMain.id, productId: sugar.id } }
    });
    const kitchenStock1 = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId: whKitchen.id, productId: sugar.id } }
    });
    assert.equal(Number(mainStock1?.quantity), 10000);
    assert.equal(Number(kitchenStock1?.quantity), 0);

    // 2. Claim request from Main Warehouse
    const claimed = await claimStockRequest(
      userA!.id,
      whMain.id,
      "ADMIN",
      req.id,
      whMain.id
    );
    assert.equal(claimed.status, "FULFILLING");
    assert.equal(claimed.sourceWarehouseId, whMain.id);

    // Verify double claim conflict
    await assert.rejects(
      claimStockRequest(userA!.id, whMain.id, "ADMIN", req.id, whMain.id),
      /already been claimed/i
    );

    // Verify stock is still unchanged after claim
    const mainStock2 = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId: whMain.id, productId: sugar.id } }
    });
    assert.equal(Number(mainStock2?.quantity), 10000);

    // 3. Ship request
    const shipped = await shipStockRequest(userA!.id, req.id);
    assert.equal(shipped.status, "SHIPPED");

    // Verify stock is deducted from Main (10000 - 4000 = 6000), Kitchen still 0
    const mainStock3 = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId: whMain.id, productId: sugar.id } }
    });
    const kitchenStock3 = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId: whKitchen.id, productId: sugar.id } }
    });
    assert.equal(Number(mainStock3?.quantity), 6000);
    assert.equal(Number(kitchenStock3?.quantity), 0);

    // 4. Receive request
    const received = await receiveStockRequest(userB!.id, whKitchen.id, "WAREHOUSE", req.id);
    assert.equal(received.status, "RECEIVED");

    // Verify no stock movements during receipt
    const kitchenStock4 = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId: whKitchen.id, productId: sugar.id } }
    });
    assert.equal(Number(kitchenStock4?.quantity), 0);

    // 5. Accept request
    const accepted = await acceptStockRequest(userB!.id, whKitchen.id, "WAREHOUSE", req.id);
    assert.equal(accepted.status, "ACCEPTED");

    // Verify stock is added to Kitchen (0 + 4000 = 4000)
    const kitchenStock5 = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId: whKitchen.id, productId: sugar.id } }
    });
    assert.equal(Number(kitchenStock5?.quantity), 4000);
  });
});
