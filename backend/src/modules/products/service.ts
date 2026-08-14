import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";

export const getLegacyProductMappings = async () => {
  return [] as any[];
};

export const getLegacyProductTarget = async () => {
  return null;
};

export const createLegacyProductMapping = async () => {
  return null;
};

export const getSellableProductWhereClause = () => ({
  isActive: true,
});

const getSellableProductAvailableStock = async (product: any) => {
  const activeWarehouseStocks = await prisma.inventoryStock.findMany({
    where: { warehouse: { isActive: true } },
    select: { materialVariantId: true, quantity: true },
  });

  const totalStockMap = new Map<string, number>();
  for (const stock of activeWarehouseStocks) {
    const current = totalStockMap.get(stock.materialVariantId) || 0;
    totalStockMap.set(stock.materialVariantId, current + Number(stock.quantity));
  }

  const committedMap = await getCommittedStockMap(prisma);

  if (product.recipe && product.recipe.items.length > 0) {
    const availableByIngredient = product.recipe.items.map((item: any) => {
      const physicalStock = totalStockMap.get(item.materialVariantId) || 0;
      const committedStock = committedMap.get(`mv:${item.materialVariantId}`) || 0;
      const available = physicalStock - committedStock;
      return available / Number(item.quantity || 1);
    });

    return availableByIngredient.length > 0 ? Math.floor(Math.min(...availableByIngredient)) : null;
  }

  if (product.directSaleMaterialVariantId) {
    const key = `mv:${product.directSaleMaterialVariantId}`;
    const physicalStock = totalStockMap.get(product.directSaleMaterialVariantId) || 0;
    const committedStock = committedMap.get(key) || 0;
    return Math.max(0, physicalStock - committedStock);
  }

  return null;
};

export const getAllProducts = async (sellableOnly = false) => {
  const sellableProducts = await prisma.sellableProduct.findMany({
    where: sellableOnly ? { isActive: true } : {},
    include: {
      category: true,
      brand: true,
      recipe: {
        include: {
          items: {
            include: {
              materialVariant: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const products = await Promise.all(
    sellableProducts.map(async (product) => ({
      ...product,
      price: product.price ? Number(product.price) : null,
      availableStock: await getSellableProductAvailableStock(product),
    }))
  );

  return products;
};

export const getProductById = async (id: string) => {
  const product = await prisma.sellableProduct.findUnique({
    where: { id },
    include: {
      category: true,
      brand: true,
      recipe: {
        include: {
          items: {
            include: {
              materialVariant: true,
            },
          },
        },
      },
    },
  });

  if (!product) return null;

  return {
    ...product,
    price: product.price ? Number(product.price) : null,
    availableStock: await getSellableProductAvailableStock(product),
  };
};

export const createProduct = async (input: any) => {
  const payload = {
    name: input.name,
    sku: input.sku ?? undefined,
    categoryId: input.categoryId ?? null,
    brandId: input.brandId ?? null,
    productType: input.productType ?? "DIRECT_SALE",
    price: input.price !== undefined && input.price !== null ? input.price.toString() : null,
    directSaleMaterialVariantId: input.directSaleMaterialVariantId ?? null,
    isActive: input.isActive ?? true,
  };

  if (!payload.name || payload.name.trim() === "") {
    throw new AppError("BAD_REQUEST", "Sellable product name is required.");
  }

  return prisma.sellableProduct.create({ data: payload });
};

export const updateProduct = async (id: string, input: any) => {
  const existing = await prisma.sellableProduct.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Sellable product not found");
  }

  const payload: any = { ...input };
  if (input.price !== undefined) {
    payload.price = input.price !== null ? input.price.toString() : null;
  }
  if (input.directSaleMaterialVariantId !== undefined) {
    payload.directSaleMaterialVariantId = input.directSaleMaterialVariantId ?? null;
  }

  return prisma.sellableProduct.update({ where: { id }, data: payload });
};

export const deleteProduct = async (id: string) => {
  return prisma.sellableProduct.update({
    where: { id },
    data: { isActive: false },
  });
};

export const getRecipeForProduct = async (sellableProductId: string) => {
  return prisma.recipe.findUnique({
    where: { sellableProductId },
    include: {
      items: {
        include: {
          materialVariant: true,
        },
      },
    },
  });
};

export const upsertRecipeForProduct = async (sellableProductId: string, items: Array<{ materialVariantId: string; quantity: number }>) => {
  const product = await prisma.sellableProduct.findUnique({ where: { id: sellableProductId } });
  if (!product) {
    throw new AppError("NOT_FOUND", "Sellable product not found.");
  }

  const recipe = await prisma.recipe.upsert({
    where: { sellableProductId },
    update: {},
    create: { sellableProductId },
  });

  await prisma.recipeItem.deleteMany({ where: { recipeId: recipe.id } });

  if (items.length > 0) {
    await prisma.recipeItem.createMany({
      data: items.map((item) => ({
        recipeId: recipe.id,
        materialVariantId: item.materialVariantId,
        quantity: item.quantity.toString(),
      })),
    });
  }

  return prisma.recipe.findUnique({
    where: { id: recipe.id },
    include: { items: { include: { materialVariant: true } } },
  });
};

export const getCommittedStockMap = async (tx: any) => {
  const activeOrders = (await tx.order.findMany({
    where: {
      status: {
        in: ["NEW", "PREPARING", "READY"],
      },
    },
    include: {
      items: true,
    },
  })) as any[];

  const committedMap = new Map<string, number>();
  const sellableIds = [
    ...new Set(
      activeOrders
        .flatMap((order: any) => order.items.map((item: any) => item.sellableProductId))
        .filter((id: any) => !!id)
    ),
  ];

  if (sellableIds.length === 0) {
    return committedMap;
  }

  const sellables: any[] = await tx.sellableProduct.findMany({
    where: { id: { in: sellableIds } },
    include: {
      recipe: {
        include: {
          items: true,
        },
      },
    },
  });

  const productMap = new Map<string, any>(sellables.map((product: any) => [product.id, product]));

  for (const order of activeOrders) {
    for (const item of order.items) {
      const product = productMap.get(item.sellableProductId);
      if (!product) continue;

      const recipe = product.recipe as any[] | null;
      if (recipe && recipe.length > 0) {
        for (const recipeItem of recipe) {
          const key = `mv:${recipeItem.materialVariantId}`;
          const current = committedMap.get(key) || 0;
          committedMap.set(key, current + Number(item.quantity) * Number(recipeItem.quantity));
        }
        continue;
      }

      if (product.directSaleMaterialVariantId) {
        const key = `mv:${product.directSaleMaterialVariantId}`;
        const current = committedMap.get(key) || 0;
        committedMap.set(key, current + Number(item.quantity));
      }
    }
  }

  return committedMap;
};

