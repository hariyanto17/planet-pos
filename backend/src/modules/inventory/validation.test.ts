import test from "node:test";
import assert from "node:assert/strict";
import { createStockTransferSchema } from "./validation";

test("createStockTransferSchema rejects identical source and destination warehouses", () => {
  const { error } = createStockTransferSchema.validate({
    sourceWarehouseId: "warehouse-1",
    destinationWarehouseId: "warehouse-1",
    items: [{ materialVariantId: "material-variant-1", quantity: 2 }],
  });

  assert.ok(error, "Expected validation to fail for identical warehouses");
  assert.match(error?.message || "", /invalid|same/i);
});
