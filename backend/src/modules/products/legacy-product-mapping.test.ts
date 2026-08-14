import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLegacyProductMappingRecord,
  resolveLegacyProductTarget,
} from "./legacyProductMapping.ts";

test("buildLegacyProductMappingRecord produces a compatibility record with a legacy reference", () => {
  const record = buildLegacyProductMappingRecord({
    legacyProductId: "prod-legacy-1",
    targetType: "MaterialVariant",
    targetId: "mat-var-2",
    sourceTable: "Product",
  });

  assert.equal(record.legacyProductId, "prod-legacy-1");
  assert.equal(record.targetType, "MaterialVariant");
  assert.equal(record.targetId, "mat-var-2");
  assert.equal(record.sourceTable, "Product");
  assert.ok(record.effectiveFrom instanceof Date);
});

test("resolveLegacyProductTarget prefers the latest mapping for the target type", () => {
  const mappings = [
    {
      id: "map-old",
      legacyProductId: "prod-legacy-1",
      targetType: "SellableProduct",
      targetId: "sell-1",
      sourceTable: "Product",
      effectiveFrom: new Date("2024-01-01T00:00:00.000Z"),
    },
    {
      id: "map-new",
      legacyProductId: "prod-legacy-1",
      targetType: "SellableProduct",
      targetId: "sell-2",
      sourceTable: "Product",
      effectiveFrom: new Date("2024-02-01T00:00:00.000Z"),
    },
  ];

  const resolved = resolveLegacyProductTarget(mappings, "SellableProduct");

  assert.deepEqual(resolved, {
    id: "map-new",
    legacyProductId: "prod-legacy-1",
    targetType: "SellableProduct",
    targetId: "sell-2",
    sourceTable: "Product",
    effectiveFrom: new Date("2024-02-01T00:00:00.000Z"),
  });
});

test("resolveLegacyProductTarget returns null when no target type mapping exists", () => {
  const result = resolveLegacyProductTarget([
    {
      id: "map-fallback",
      legacyProductId: "prod-legacy-1",
      targetType: "MaterialVariant",
      targetId: "mat-var-9",
      sourceTable: "Product",
      effectiveFrom: new Date("2024-02-01T00:00:00.000Z"),
    },
  ], "SellableProduct");

  assert.equal(result, null);
});
