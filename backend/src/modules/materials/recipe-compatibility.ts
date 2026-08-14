export type RecipeCompatibilityInput = {
  productId?: string | null;
  sellableProductId?: string | null;
  items: Array<{
    id?: string;
    componentProductId?: string | null;
    materialVariantId?: string | null;
    quantity: number | string;
    unitId?: string | null;
  }>;
};

export const normalizeRecipeCompatibilityInput = (input: RecipeCompatibilityInput) => {
  if (!input.productId && !input.sellableProductId) {
    throw new Error("Recipe requires either a legacy productId or a sellableProductId.");
  }

  return {
    productId: input.productId ?? null,
    sellableProductId: input.sellableProductId ?? null,
    items: input.items.map((item) => ({
      id: item.id ?? undefined,
      componentProductId: item.componentProductId ?? null,
      materialVariantId: item.materialVariantId ?? null,
      quantity: String(item.quantity),
      unitId: item.unitId ?? null,
    })),
  };
};
