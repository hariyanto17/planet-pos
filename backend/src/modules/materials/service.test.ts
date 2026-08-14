import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBrandInput,
  normalizeMaterialInput,
  normalizeMaterialVariantInput,
  normalizeSellableProductInput,
  normalizeInventoryStockInput,
} from "./service";

test("normalizeBrandInput keeps the legacy product flow untouched while creating brand data", () => {
  const normalized = normalizeBrandInput({ name: " Brand A " });

  assert.deepEqual(normalized, {
    name: "Brand A",
    isActive: true,
  });
});

test("normalizeMaterialInput links material data to the provided brand", () => {
  const normalized = normalizeMaterialInput({
    brandId: "brand-1",
    name: "UHT Milk",
    description: "Whole milk",
  });

  assert.deepEqual(normalized, {
    brandId: "brand-1",
    categoryId: null,
    name: "UHT Milk",
    description: "Whole milk",
    isActive: true,
  });
});

test("normalizeMaterialVariantInput preserves base unit and quantity values", () => {
  const normalized = normalizeMaterialVariantInput({
    materialId: "material-1",
    name: "600 ML",
    contentQuantity: 600,
    contentUnit: "ML",
    baseUnit: "ML",
    sku: "MILK-600",
  });

  assert.deepEqual(normalized, {
    materialId: "material-1",
    name: "600 ML",
    variantCode: null,
    contentQuantity: "600",
    contentUnit: "ML",
    baseUnit: "ML",
    sku: "MILK-600",
    barcode: null,
    isActive: true,
  });
});

test("normalizeSellableProductInput keeps direct-sale sellable product data valid", () => {
  const normalized = normalizeSellableProductInput({
    name: "Fresh Milk 600 ML",
    sku: " SELL-1 ",
    productType: "DIRECT_SALE",
    price: 18000,
  });

  assert.deepEqual(normalized, {
    name: "Fresh Milk 600 ML",
    sku: "SELL-1",
    categoryId: null,
    brandId: null,
    productType: "DIRECT_SALE",
    price: "18000",
    isActive: true,
  });
});

test("normalizeInventoryStockInput stores material-variant stock by warehouse and variant", () => {
  const normalized = normalizeInventoryStockInput({
    warehouseId: "warehouse-1",
    materialVariantId: "material-variant-1",
    quantity: 12,
  });

  assert.deepEqual(normalized, {
    warehouseId: "warehouse-1",
    materialVariantId: "material-variant-1",
    quantity: "12",
  });
});
