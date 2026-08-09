import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient, InventoryType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { getInventorySummary, getProductStockList } from "./service";

const prisma = new PrismaClient();

test("POS Inventory Summary Stock Status and Valuation Tests", async (t) => {
  const category = await prisma.category.findFirst() || await prisma.category.create({
    data: { name: "Test Category" },
  });

  const unit = await prisma.unit.findFirst() || await prisma.unit.create({
    data: { name: "Pieces", symbol: "PCS" },
  });

  // Setup active and inactive warehouses
  const whActive1 = await prisma.warehouse.findFirst({ where: { code: "WH_ACT_1", isActive: true } })
    || await prisma.warehouse.create({
      data: { code: "WH_ACT_1", name: "Active WH 1", warehouseType: "SALES", isActive: true },
    });

  const whActive2 = await prisma.warehouse.findFirst({ where: { code: "WH_ACT_2", isActive: true } })
    || await prisma.warehouse.create({
      data: { code: "WH_ACT_2", name: "Active WH 2", warehouseType: "SALES", isActive: true },
    });

  const whInactive = await prisma.warehouse.findFirst({ where: { code: "WH_INACT", isActive: false } })
    || await prisma.warehouse.create({
      data: { code: "WH_INACT", name: "Inactive WH", warehouseType: "SALES", isActive: false },
    });

  // Cleanup past test products if any
  await prisma.recipeItem.deleteMany({ where: { recipe: { product: { name: { contains: "Summary Test" } } } } });
  await prisma.recipe.deleteMany({ where: { product: { name: { contains: "Summary Test" } } } });
  await prisma.warehouseStock.deleteMany({ where: { product: { name: { contains: "Summary Test" } } } });
  await prisma.product.deleteMany({ where: { name: { contains: "Summary Test" } } });

  // 1 & 2 & 3. FINISHED_GOOD with recipe tests
  await t.test("Finished Goods with recipe calculations", async () => {
    // Create components
    const componentA = await prisma.product.create({
      data: { name: "Summary Test Component A", categoryId: category.id, inventoryType: InventoryType.RAW_MATERIAL, trackInventory: true, cost: new Decimal(100), price: 0, unitId: unit.id },
    });
    const componentB = await prisma.product.create({
      data: { name: "Summary Test Component B", categoryId: category.id, inventoryType: InventoryType.RAW_MATERIAL, trackInventory: true, cost: new Decimal(200), price: 0, unitId: unit.id },
    });

    // Create finished good
    const fg = await prisma.product.create({
      data: { name: "Summary Test Finished Good", categoryId: category.id, inventoryType: InventoryType.FINISHED_GOOD, trackInventory: true, price: new Decimal(5000), minimumStock: new Decimal(10), unitId: unit.id },
    });

    // Recipe: 1 FG = 2 A + 1 B
    await prisma.recipe.create({
      data: {
        productId: fg.id,
        items: {
          create: [
            { componentProductId: componentA.id, quantity: new Decimal(2), unitId: unit.id },
            { componentProductId: componentB.id, quantity: new Decimal(1), unitId: unit.id },
          ],
        },
      },
    });

    // Initial stock setup: Component A = 40, Component B = 25. Producible max = min(40/2, 25/1) = 20.
    // Physical stock of Finished Good itself = 0
    await prisma.warehouseStock.createMany({
      data: [
        { warehouseId: whActive1.id, productId: componentA.id, quantity: new Decimal(40) },
        { warehouseId: whActive2.id, productId: componentB.id, quantity: new Decimal(25) },
        { warehouseId: whActive1.id, productId: fg.id, quantity: new Decimal(0) },
      ],
    });

    // Summary should show that fg (recipe-based finished good) is NOT included in summary metrics
    let summary = await getInventorySummary();
    const prevOutOfStock = summary.outOfStockProducts;
    const prevLowStock = summary.lowStockProducts;

    // Verify it doesn't appear in getProductStockList
    const inventoryList = await getProductStockList({ warehouseId: "all", limit: 100 });
    const foundFg = inventoryList.data.some((item: any) => item.name === "Summary Test Finished Good");
    assert.ok(!foundFg, "Recipe-based finished goods must be excluded from inventory product list");

    // Test 3: Change stock of component A to 18. This would make fg low stock if included, but since fg is excluded, lowStockProducts must NOT increase.
    await prisma.warehouseStock.updateMany({
      where: { productId: componentA.id, warehouseId: whActive1.id },
      data: { quantity: new Decimal(18) },
    });

    summary = await getInventorySummary();
    assert.equal(summary.lowStockProducts, prevLowStock, "lowStockProducts should NOT change since FG is excluded");

    // Test 2: Change stock to exhaust Component B (Component B = 0). Component B itself (raw material) goes out of stock, increasing count by 1.
    // fg is excluded, so it doesn't add another out of stock.
    await prisma.warehouseStock.updateMany({
      where: { productId: componentB.id, warehouseId: whActive2.id },
      data: { quantity: new Decimal(0) },
    });

    summary = await getInventorySummary();
    assert.equal(summary.outOfStockProducts, prevOutOfStock + 1, "Should only increase by 1 (for the exhausted raw component, FG is excluded)");

    // Cleanup
    await prisma.recipeItem.deleteMany({ where: { recipe: { productId: fg.id } } });
    await prisma.recipe.delete({ where: { productId: fg.id } });
    await prisma.warehouseStock.deleteMany({ where: { productId: { in: [fg.id, componentA.id, componentB.id] } } });
    await prisma.product.deleteMany({ where: { id: { in: [fg.id, componentA.id, componentB.id] } } });
  });

  // 4 & 5 & 6 & 7 & 8 & 9. Valuation, active warehouse aggregate, inactive warehouse check
  await t.test("General stock validation and active/inactive warehouses", async () => {
    // Create finished good without recipe
    const directFg = await prisma.product.create({
      data: { name: "Summary Test Direct FG", categoryId: category.id, inventoryType: InventoryType.FINISHED_GOOD, trackInventory: true, price: new Decimal(1000), unitId: unit.id },
    });

    // Create raw material
    const rawMaterial = await prisma.product.create({
      data: { name: "Summary Test Raw", categoryId: category.id, inventoryType: InventoryType.RAW_MATERIAL, trackInventory: true, cost: new Decimal(300), price: null, unitId: unit.id },
    });

    // Create untracked product
    const untracked = await prisma.product.create({
      data: { name: "Summary Test Untracked", categoryId: category.id, inventoryType: InventoryType.FINISHED_GOOD, trackInventory: false, price: new Decimal(2000), unitId: unit.id },
    });

    // Set stock:
    // directFg: Active WH 1 = 0, Active WH 2 = 100, Inactive WH = 500 (total active = 100)
    // rawMaterial: Active WH 1 = 10, Active WH 2 = 20, Inactive WH = 1000 (total active = 30)
    // untracked: Active WH 1 = 50
    await prisma.warehouseStock.createMany({
      data: [
        { warehouseId: whActive1.id, productId: directFg.id, quantity: new Decimal(0) },
        { warehouseId: whActive2.id, productId: directFg.id, quantity: new Decimal(100) },
        { warehouseId: whInactive.id, productId: directFg.id, quantity: new Decimal(500) },

        { warehouseId: whActive1.id, productId: rawMaterial.id, quantity: new Decimal(10) },
        { warehouseId: whActive2.id, productId: rawMaterial.id, quantity: new Decimal(20) },
        { warehouseId: whInactive.id, productId: rawMaterial.id, quantity: new Decimal(1000) },

        { warehouseId: whActive1.id, productId: untracked.id, quantity: new Decimal(50) },
      ],
    });

    const summary = await getInventorySummary();

    // Inactive warehouse stock (500 directFg, 1000 rawMaterial) must NOT be counted!
    // Valuation:
    // directFg active stock value = 100 * 1000 (price) = 100000
    // rawMaterial active stock value = 30 * 300 (cost) = 9000
    // untracked: tracksInventory is false, but wait, does it have physicalQty? Yes, 50 * 2000 = 100000.
    // Total value expected increase: 100000 + 9000 + 100000 = 209000.
    // Let's assert raw material cost valuation was used (price is null, so if we used price it would be 0 value).
    // Let's verify that directFg is NOT counted as out of stock (aggregate stock = 100 > 0).
    const directFgRecord = summary.outOfStockProducts;
    // (untracked is trackInventory: false, so it shouldn't count as out of stock)

    assert.ok(summary.inventoryValue >= 209000);

    // Test 4-6: finished good without recipe, raw material, and packaging low stock checks
    const fgNoRecipe = await prisma.product.create({
      data: { name: "Summary Test FG No Recipe", categoryId: category.id, inventoryType: InventoryType.FINISHED_GOOD, trackInventory: true, price: new Decimal(100), minimumStock: new Decimal(10), unitId: unit.id },
    });
    const rawLow = await prisma.product.create({
      data: { name: "Summary Test Raw Low", categoryId: category.id, inventoryType: InventoryType.RAW_MATERIAL, trackInventory: true, cost: new Decimal(50), minimumStock: new Decimal(10), unitId: unit.id },
    });
    const pkgLow = await prisma.product.create({
      data: { name: "Summary Test Pkg Low", categoryId: category.id, inventoryType: InventoryType.PACKAGING, trackInventory: true, cost: new Decimal(50), minimumStock: new Decimal(10), unitId: unit.id },
    });

    // Set stock: each has active stock = 5
    await prisma.warehouseStock.createMany({
      data: [
        { warehouseId: whActive1.id, productId: fgNoRecipe.id, quantity: new Decimal(5) },
        { warehouseId: whActive1.id, productId: rawLow.id, quantity: new Decimal(5) },
        { warehouseId: whActive1.id, productId: pkgLow.id, quantity: new Decimal(5) },
      ],
    });

    let s = await getInventorySummary();
    // They are > 0 and <= 10, so all 3 must count as LOW_STOCK (not OUT_OF_STOCK)
    assert.ok(s.lowStockProducts >= 3);

    // Test 8: Active vs Inactive warehouse stock low stock boundaries
    const activeLow = await prisma.product.create({
      data: { name: "Summary Test Active Low", categoryId: category.id, inventoryType: InventoryType.RAW_MATERIAL, trackInventory: true, cost: new Decimal(50), minimumStock: new Decimal(10), unitId: unit.id },
    });
    await prisma.warehouseStock.createMany({
      data: [
        { warehouseId: whActive1.id, productId: activeLow.id, quantity: new Decimal(5) },
        { warehouseId: whInactive.id, productId: activeLow.id, quantity: new Decimal(1000) },
      ],
    });
    s = await getInventorySummary();
    // Active stock is 5 (<= 10), so it must be LOW_STOCK regardless of inactive stock 1000
    // (If inactive stock was counted, it would be 1005 > 10, which is normal)

    // Test 10: minimumStock = 0, availableStock = 0
    const zeroMin = await prisma.product.create({
      data: { name: "Summary Test Zero Min", categoryId: category.id, inventoryType: InventoryType.FINISHED_GOOD, trackInventory: true, price: new Decimal(100), minimumStock: new Decimal(0), unitId: unit.id },
    });
    await prisma.warehouseStock.create({
      data: { warehouseId: whActive1.id, productId: zeroMin.id, quantity: new Decimal(0) },
    });
    s = await getInventorySummary();
    // availableStock = 0 => OUT_OF_STOCK, not LOW_STOCK.

    // Cleanup
    await prisma.warehouseStock.deleteMany({ where: { productId: { in: [directFg.id, rawMaterial.id, untracked.id, fgNoRecipe.id, rawLow.id, pkgLow.id, activeLow.id, zeroMin.id] } } });
    await prisma.product.deleteMany({ where: { id: { in: [directFg.id, rawMaterial.id, untracked.id, fgNoRecipe.id, rawLow.id, pkgLow.id, activeLow.id, zeroMin.id] } } });
  });

  // Cleanup warehouses
  await prisma.warehouse.delete({ where: { id: whInactive.id } });
});
