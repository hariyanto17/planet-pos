import test from "node:test";
import assert from "node:assert/strict";
import { createStockTransferSchema, receiveStockSchema } from "./validation";

test("createStockTransferSchema rejects identical source and destination warehouses", () => {
  const { error } = createStockTransferSchema.validate({
    productId: "product-1",
    variantId: "variant-1",
    sourceWarehouseId: "warehouse-1",
    destinationWarehouseId: "warehouse-1",
    quantity: 2,
  });

  assert.ok(error, "Expected validation to fail for identical warehouses");
  assert.match(error?.message || "", /invalid|same/i);
});

test("receiveStockSchema requires product and variant ids, while allowing optional packaging", () => {
  const validReceipt = {
    productId: "product-1",
    variantId: "variant-1",
    warehouseId: "warehouse-1",
    quantity: 5,
  };

  assert.equal(receiveStockSchema.validate(validReceipt).error, undefined);
  assert.equal(receiveStockSchema.validate({ ...validReceipt, packagingId: "packaging-1" }).error, undefined);
  assert.ok(receiveStockSchema.validate({ ...validReceipt, quantity: 0 }).error);
  assert.ok(receiveStockSchema.validate({ ...validReceipt, productId: undefined }).error);
  assert.ok(receiveStockSchema.validate({ ...validReceipt, variantId: undefined }).error);
});
