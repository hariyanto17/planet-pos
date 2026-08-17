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
    const availableByIngredient = await Promise.all(
      product.recipe.items.map(async (item: any) => {
        const variants = await prisma.materialVariant.findMany({
          where: { materialId: item.materialId, isActive: true },
          select: { id: true },
        });
        const variantIds = variants.map((v) => v.id);

        let physicalStock = 0;
        let committedStock = 0;

        for (const variantId of variantIds) {
          physicalStock += totalStockMap.get(variantId) || 0;
          committedStock += committedMap.get(`mv:${variantId}`) || 0;
        }

        const available = physicalStock - committedStock;
        return available / Number(item.quantity || 1);
      })
    );

    return availableByIngredient.length > 0 ? Math.floor(Math.min(...availableByIngredient)) : null;
  }

  if (product.directSaleMaterialVariantId) {
    const physicalStock = totalStockMap.get(product.directSaleMaterialVariantId) || 0;
    const committedStock = committedMap.get(`mv:${product.directSaleMaterialVariantId}`) || 0;
    return Math.floor(Math.max(0, physicalStock - committedStock));
  }

  return null;
};

export const getAllProducts = async (sellableOnly = false) => {
  const sellableProducts = await prisma.sellableProduct.findMany({
    where: sellableOnly ? { isActive: true } : {},
    include: {
      category: true,
      brand: true,
      directSaleMaterialVariant: {
        include: {
          material: true
        }
      },
      recipe: {
        include: {
          items: {
            include: {
              material: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const productsList = await Promise.all(
    sellableProducts.map(async (product) => {
      const trackInventory = product.directSaleMaterialVariantId !== null || product.recipe !== null;
      let inventoryType = "";
      let baseUnit = "";
      let unitId = "";
      let costVal = product.cost ? Number(product.cost) : null;

      if (product.directSaleMaterialVariant) {
        inventoryType = "FINISHED_GOOD";
        baseUnit = (product.directSaleMaterialVariant as any).material.baseUnit;
        costVal = product.directSaleMaterialVariant.cost ? Number(product.directSaleMaterialVariant.cost) : costVal;
      } else if (product.recipe) {
        inventoryType = "FINISHED_GOOD";
      }

      return {
        ...product,
        price: product.price ? Number(product.price) : null,
        cost: costVal,
        trackInventory,
        inventoryType,
        baseUnit,
        unitId,
        availableStock: await getSellableProductAvailableStock(product),
      };
    })
  );

  if (sellableOnly) {
    return productsList;
  }

  const materials = await prisma.material.findMany({
    include: {
      category: true,
      brand: true,
      variants: {
        include: {
          supplierOffers: {
            include: {
              supplier: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const linkedMvIds = new Set(
    sellableProducts.map((p) => p.directSaleMaterialVariantId).filter((id) => id !== null)
  );

  const rawMaterialsList = materials.map((material) => {
    const categoryName = material.category?.name || "";
    const isPackaging = /kemasan/i.test(categoryName) || /packaging/i.test(categoryName);
    const inventoryType = isPackaging ? "PACKAGING" : "RAW_MATERIAL";

    const unlinkedVariants = material.variants.filter((v) => !linkedMvIds.has(v.id));

    return {
      id: material.id,
      name: material.name,
      sku: unlinkedVariants[0]?.sku || null,
      categoryId: material.categoryId,
      category: material.category,
      brandId: material.brandId,
      brand: material.brand,
      price: null,
      cost: null,
      isActive: material.isActive,
      trackInventory: true,
      inventoryType,
      baseUnit: material.baseUnit || null,
      variants: unlinkedVariants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        barcode: v.barcode,
        baseUnit: material.baseUnit,
        quantityInBaseUnit: v.quantityInBaseUnit ? Number(v.quantityInBaseUnit) : null,
        cost: v.cost ? Number(v.cost) : null,
        isActive: v.isActive,
        supplierOffers: v.supplierOffers.map((o) => ({
          id: o.id,
          supplierId: o.supplierId,
          supplierName: o.supplier?.name || "",
          price: o.unitPrice ? Number(o.unitPrice) : null,
        })),
      })),
      availableStock: null,
    };
  });

  return [...productsList, ...rawMaterialsList];
};

export const getProductById = async (id: string) => {
  const product = await prisma.sellableProduct.findUnique({
    where: { id },
    include: {
      category: true,
      brand: true,
      directSaleMaterialVariant: {
        include: {
          material: true
        }
      },
      recipe: {
        include: {
          items: {
            include: {
              material: true,
            },
          },
        },
      },
    },
  });

  if (product) {
    const trackInventory = product.directSaleMaterialVariantId !== null || product.recipe !== null;
    let inventoryType = "";
    let baseUnit = "";
    let costVal = product.cost ? Number(product.cost) : null;

    if (product.directSaleMaterialVariant) {
      inventoryType = "FINISHED_GOOD";
      baseUnit = (product.directSaleMaterialVariant as any).material.baseUnit;
      costVal = product.directSaleMaterialVariant.cost ? Number(product.directSaleMaterialVariant.cost) : costVal;
    } else if (product.recipe) {
      inventoryType = "FINISHED_GOOD";
    }

    return {
      ...product,
      price: product.price ? Number(product.price) : null,
      cost: costVal,
      trackInventory,
      inventoryType,
      baseUnit,
      availableStock: await getSellableProductAvailableStock(product),
    };
  }

  const material = await prisma.material.findUnique({
    where: { id },
    include: {
      category: true,
      brand: true,
      variants: {
        include: {
          supplierOffers: {
            include: {
              supplier: true,
            },
          },
        },
      },
    },
  });

  if (material) {
    const categoryName = material.category?.name || "";
    const isPackaging = /kemasan/i.test(categoryName) || /packaging/i.test(categoryName);
    const inventoryType = isPackaging ? "PACKAGING" : "RAW_MATERIAL";

    return {
      id: material.id,
      name: material.name,
      categoryId: material.categoryId,
      category: material.category,
      brandId: material.brandId,
      brand: material.brand,
      description: material.description,
      price: null,
      cost: null,
      isActive: material.isActive,
      trackInventory: true,
      inventoryType,
      variants: material.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        barcode: v.barcode,
        baseUnit: material.baseUnit,
        quantityInBaseUnit: v.quantityInBaseUnit ? Number(v.quantityInBaseUnit) : null,
        cost: v.cost ? Number(v.cost) : null,
        isActive: v.isActive,
        supplierOffers: v.supplierOffers.map((o) => ({
          id: o.id,
          supplierId: o.supplierId,
          supplierName: o.supplier?.name || "",
          price: o.unitPrice ? Number(o.unitPrice) : null,
        })),
      })),
      availableStock: null,
    };
  }

  return null;
};

export const createProduct = async (input: any) => {
  if (!input.name || input.name.trim() === "") {
    throw new AppError("BAD_REQUEST", "Sellable product name is required.");
  }

  // Use a transaction to ensure SellableProduct and Recipe are created atomically
  const result = await prisma.$transaction(async (tx) => {
    const sellableProduct = await tx.sellableProduct.create({
      data: {
        name: input.name,
        sku: input.sku || null,
        barcode: input.barcode || null,
        categoryId: input.categoryId || null,
        brandId: input.brandId || null,
        productType: input.productType || "DIRECT_SALE",
        price: input.price !== undefined && input.price !== null ? input.price.toString() : null,
        directSaleMaterialVariantId: input.directSaleMaterialVariantId || null,
        isActive: input.isActive ?? true,
      },
    });

    if (input.recipe && input.recipe.items && input.recipe.items.length > 0) {
      const recipe = await tx.recipe.create({
        data: {
          sellableProductId: sellableProduct.id,
        },
      });

      for (const item of input.recipe.items) {
        const materialExists = await tx.material.findUnique({
          where: { id: item.materialId },
        });
        if (!materialExists) {
          throw new AppError("BAD_REQUEST", `Bahan baku dengan ID ${item.materialId} tidak ditemukan.`);
        }

        await tx.recipeItem.create({
          data: {
            recipeId: recipe.id,
            materialId: item.materialId,
            quantity: item.quantity.toString(),
            note: item.note || null,
          },
        });
      }
    }

    return sellableProduct;
  });

  return getProductById(result.id);
};

export const updateProduct = async (id: string, input: any) => {
  const variant = await prisma.materialVariant.findUnique({
    where: { id },
    include: { material: true },
  });

  if (variant) {
    const updatedVariant = await prisma.materialVariant.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        sku: input.sku ?? undefined,
        isActive: input.isActive ?? undefined,
        cost: input.cost !== undefined && input.cost !== null ? input.cost.toString() : undefined,
      },
    });

    await prisma.material.update({
      where: { id: variant.materialId },
      data: {
        name: input.name ?? undefined,
        baseUnit: input.baseUnit ?? undefined,
        categoryId: input.categoryId !== undefined ? (input.categoryId ?? null) : undefined,
        brandId: input.brandId !== undefined ? (input.brandId ?? null) : undefined,
        isActive: input.isActive ?? undefined,
      },
    });

    const material = await prisma.material.findUnique({
      where: { id: variant.materialId },
      include: { category: true, brand: true },
    });

    const categoryName = material?.category?.name || "";
    const isPackaging = /kemasan/i.test(categoryName) || /packaging/i.test(categoryName);
    const inventoryType = isPackaging ? "PACKAGING" : "RAW_MATERIAL";

    return {
      id: updatedVariant.id,
      name: updatedVariant.name,
      sku: updatedVariant.sku,
      categoryId: material?.categoryId,
      category: material?.category,
      brandId: material?.brandId,
      brand: material?.brand,
      price: null,
      cost: updatedVariant.cost ? Number(updatedVariant.cost) : null,
      trackInventory: true,
      inventoryType,
      baseUnit: material?.baseUnit,
      isActive: updatedVariant.isActive,
      createdAt: updatedVariant.createdAt,
      updatedAt: updatedVariant.updatedAt,
    };
  }

  const existing = await prisma.sellableProduct.findUnique({
    where: { id },
    include: { directSaleMaterialVariant: true },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", "Sellable product not found");
  }

  let directSaleMaterialVariantId = existing.directSaleMaterialVariantId;
  if (directSaleMaterialVariantId) {
    const currentMv = await prisma.materialVariant.update({
      where: { id: directSaleMaterialVariantId },
      data: {
        name: input.name ?? undefined,
        sku: input.sku ?? undefined,
        isActive: input.isActive ?? undefined,
        cost: input.cost !== undefined && input.cost !== null ? input.cost.toString() : undefined,
      },
    });

    await prisma.material.update({
      where: { id: currentMv.materialId },
      data: {
        name: input.name ?? undefined,
        baseUnit: input.baseUnit ?? undefined,
        categoryId: input.categoryId !== undefined ? (input.categoryId ?? null) : undefined,
        brandId: input.brandId !== undefined ? (input.brandId ?? null) : undefined,
        isActive: input.isActive ?? undefined,
      },
    });
  } else if (input.trackInventory && input.inventoryType === "FINISHED_GOOD") {
    const material = await prisma.material.create({
      data: {
        name: input.name || existing.name,
        categoryId: input.categoryId !== undefined ? (input.categoryId ?? null) : (existing.categoryId ?? null),
        brandId: input.brandId !== undefined ? (input.brandId ?? null) : (existing.brandId ?? null),
        baseUnit: input.baseUnit || "PCS",
        isActive: input.isActive ?? existing.isActive,
      },
    });

    const variant = await prisma.materialVariant.create({
      data: {
        materialId: material.id,
        name: input.name || existing.name,
        quantityInBaseUnit: 1.0,
        sku: input.sku || undefined,
        isActive: input.isActive ?? existing.isActive,
        cost: input.cost !== undefined && input.cost !== null ? input.cost.toString() : null,
      },
    });
    directSaleMaterialVariantId = variant.id;
  }

  const payload: any = {
    name: input.name ?? undefined,
    sku: input.sku ?? undefined,
    categoryId: input.categoryId !== undefined ? (input.categoryId ?? null) : undefined,
    brandId: input.brandId !== undefined ? (input.brandId ?? null) : undefined,
    productType: input.productType ?? undefined,
    isActive: input.isActive ?? undefined,
    directSaleMaterialVariantId,
  };

  if (input.price !== undefined) {
    payload.price = input.price !== null ? input.price.toString() : null;
  }
  if (input.cost !== undefined) {
    payload.cost = input.cost !== null ? input.cost.toString() : null;
  }

  return prisma.sellableProduct.update({ where: { id }, data: payload });
};

export const deleteProduct = async (id: string) => {
  const mv = await prisma.materialVariant.findUnique({ where: { id } });
  if (mv) {
    return prisma.materialVariant.update({
      where: { id },
      data: { isActive: false },
    });
  }

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
          material: {
            include: {
              variants: {
                where: { isActive: true },
              },
            },
          },
        },
      },
    },
  });
};

export const upsertRecipeForProduct = async (sellableProductId: string, items: Array<{ materialId: string; quantity: number }>) => {
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
        materialId: item.materialId,
        quantity: item.quantity.toString(),
      })),
    });
  }

  return prisma.recipe.findUnique({
    where: { id: recipe.id },
    include: {
      items: {
        include: {
          material: {
            include: {
              variants: {
                where: { isActive: true },
              },
            },
          },
        },
      },
    },
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

