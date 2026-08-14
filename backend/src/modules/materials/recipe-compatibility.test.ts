import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRecipeCompatibilityInput } from "./recipe-compatibility";

test("normalizeRecipeCompatibilityInput accepts a legacy product recipe or a sellable-product recipe", () => {
  const normalized = normalizeRecipeCompatibilityInput({
    productId: "legacy-product-1",
    items: [
      {
        componentProductId: "component-1",
        quantity: 4,
        unitId: "unit-1",
      },
      {
        materialVariantId: "variant-1",
        quantity: 2,
        unitId: "unit-2",
      },
    ],
  });

  assert.deepEqual(normalized, {
    productId: "legacy-product-1",
    sellableProductId: null,
    items: [
      {
        id: undefined,
        componentProductId: "component-1",
        materialVariantId: null,
        quantity: "4",
        unitId: "unit-1",
      },
      {
        id: undefined,
        componentProductId: null,
        materialVariantId: "variant-1",
        quantity: "2",
        unitId: "unit-2",
      },
    ],
  });
});

test("normalizeRecipeCompatibilityInput rejects a recipe with no target reference", () => {
  assert.throws(() => {
    normalizeRecipeCompatibilityInput({
      items: [{ quantity: 1, unitId: "unit-1" }],
    });
  }, /either a legacy productId or a sellableProductId/i);
});
