import { prisma } from "../../utils/prisma";
import { CreateProductInput, UpdateProductInput } from "./interface";
import { AppError } from "../../utils/errorHandler";
import { validateUnitCompatibility, convertToBaseUnit } from "../../utils/units";

export const getSellableProductWhereClause = () => {
  return {
    deletedAt: null,
    isActive: true,
    inventoryType: "FINISHED_GOOD",
    price: {
      not: null,
      gt: 0,
    },
  };
};

export const getAllProducts = async (sellableOnly: boolean = false) => {
  const whereClause: any = sellableOnly
    ? getSellableProductWhereClause()
    : { deletedAt: null };
  const products = await prisma.product.findMany({
    where: whereClause,
    include: { 
      category: true, 
      unit: true,
      unitConversions: {
        include: { unit: true },
      },
      recipe: {
        include: {
          items: {
            include: {
              componentProduct: {
                include: {
                  unit: true
                }
              },
              unit: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  const activeWarehouseStocks = await prisma.warehouseStock.findMany({
    where: {
      warehouse: {
        isActive: true,
      },
    },
    select: {
      productId: true,
      quantity: true,
    },
  });

  const totalStockMap = new Map<string, number>();
  for (const ws of activeWarehouseStocks) {
    const current = totalStockMap.get(ws.productId) || 0;
    totalStockMap.set(ws.productId, current + Number(ws.quantity));
  }

  const committedMap = await getCommittedStockMap(prisma);

  return products.map((product: any) => {
    let availableStock: number | null = null;

    if (product.inventoryType === "FINISHED_GOOD" && product.trackInventory) {
      if (product.recipe && product.recipe.items && product.recipe.items.length > 0) {
        let minProducible = Infinity;
        for (const item of product.recipe.items) {
          if (item.componentProduct && !item.componentProduct.trackInventory) {
            continue;
          }
          const componentPhysical = totalStockMap.get(item.componentProductId) || 0;
          const componentCommitted = committedMap.get(item.componentProductId) || 0;
          const componentStock = componentPhysical - componentCommitted;

          const requiredQty = Number(item.quantity);
          const producible = Math.floor(componentStock / requiredQty);
          if (producible < minProducible) {
            minProducible = producible;
          }
        }
        availableStock = minProducible === Infinity ? null : Math.max(0, minProducible);
      } else {
        const ownPhysical = totalStockMap.get(product.id) || 0;
        const ownCommitted = committedMap.get(product.id) || 0;
        const ownStock = ownPhysical - ownCommitted;
        availableStock = Math.max(0, ownStock);
      }
    }

    const mappedRecipe = product.recipe
      ? {
          id: product.recipe.id,
          isActive: true,
          items: product.recipe.items.map((item: any) => ({
            id: item.id,
            quantity: item.quantity,
            product: item.componentProduct
              ? {
                  id: item.componentProduct.id,
                  name: item.componentProduct.name,
                  inventoryType: item.componentProduct.inventoryType,
                  trackInventory: item.componentProduct.trackInventory,
                  unit: item.componentProduct.unit,
                }
              : null,
          })),
        }
      : null;

    return {
      ...product,
      availableStock,
      recipe: mappedRecipe,
      unitConversions: product.unitConversions?.map((conversion: any) => ({
        id: conversion.id,
        unit: conversion.unit?.symbol,
        unitName: conversion.unit?.name,
        baseQuantity: conversion.baseQuantity.toString(),
      })) || [],
    };
  });
};

export const getProductById = async (id: string) => {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: { category: true, unit: true, unitConversions: { include: { unit: true } } },
  });

  if (!product) return null;

  return {
    ...product,
    unitConversions: product.unitConversions?.map((conversion: any) => ({
      id: conversion.id,
      unit: conversion.unit?.symbol,
      unitName: conversion.unit?.name,
      baseQuantity: conversion.baseQuantity.toString(),
    })) || [],
  };
};

export const createProduct = async (input: CreateProductInput) => {
  const type = input.inventoryType || "FINISHED_GOOD";
  
  if (type === "FINISHED_GOOD") {
    if (input.price === undefined || input.price === null) {
      throw new AppError("BAD_REQUEST", "Selling price is required for FINISHED_GOOD products.");
    }
  } else {
    input.price = null;
  }

  const data: any = {
    ...input,
    price: input.price !== undefined && input.price !== null ? input.price.toString() : null,
    cost: input.cost !== undefined && input.cost !== null ? input.cost.toString() : null,
  };
  if (input.minimumStock !== undefined && input.minimumStock !== null) {
    data.minimumStock = input.minimumStock.toString();
  }
  if (!data.sku || data.sku.trim() === "") {
    data.sku = `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  return prisma.product.create({
    data,
  });
};

export const updateProduct = async (id: string, input: UpdateProductInput) => {
  const existingProduct = await prisma.product.findUnique({ where: { id } });
  if (!existingProduct) {
    throw new AppError("NOT_FOUND", "Product not found");
  }

  const newType = input.inventoryType !== undefined ? input.inventoryType : existingProduct.inventoryType;

  if (newType === "FINISHED_GOOD") {
    const priceToCheck = input.price !== undefined ? input.price : existingProduct.price;
    if (priceToCheck === null || priceToCheck === undefined) {
      throw new AppError("BAD_REQUEST", "Selling price is required for FINISHED_GOOD products.");
    }
  } else {
    input.price = null;
  }

  const updateData: any = { ...input };
  if (input.price !== undefined) {
    updateData.price = input.price !== null ? input.price.toString() : null;
  }
  if (input.cost !== undefined) {
    updateData.cost = input.cost !== null ? input.cost.toString() : null;
  }
  if (input.minimumStock !== undefined && input.minimumStock !== null) {
    updateData.minimumStock = input.minimumStock.toString();
  }
  if (input.sku !== undefined && (input.sku === null || input.sku.trim() === "")) {
    input.sku = `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  if (input.trackInventory === false) {
    updateData.inventoryType = "FINISHED_GOOD";
    updateData.unitId = null;
    updateData.minimumStock = null;
    updateData.baseUnit = null;
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: updateData,
  });

  if (input.unitConversions && Array.isArray(input.unitConversions)) {
    await prisma.productUnitConversion.deleteMany({
      where: { productId: id },
    });

    if (input.unitConversions.length > 0) {
      const conversionData: any[] = [];
      for (const conversion of input.unitConversions) {
        const unit = await prisma.unit.findFirst({
          where: { symbol: conversion.unit.toUpperCase() },
        });

        if (!unit) {
          throw new AppError("BAD_REQUEST", `Unit '${conversion.unit}' not found.`);
        }

        conversionData.push({
          productId: id,
          unitId: unit.id,
          baseQuantity: conversion.baseQuantity.toString(),
          isDefault: conversion.isDefault || false,
        });
      }

      await prisma.productUnitConversion.createMany({
        data: conversionData,
      });
    }
  }

  return updatedProduct;
};

export const deleteProduct = async (id: string) => {
  return prisma.product.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

export const getRecipeForProduct = async (productId: string) => {
  return prisma.recipe.findUnique({
    where: { productId },
    include: {
      items: {
        include: {
          componentProduct: {
            include: { unit: true }
          },
          unit: true
        }
      }
    }
  });
};

export const upsertRecipeForProduct = async (productId: string, items: Array<{ componentProductId: string; quantity: number; unitId: string }>) => {
  const product = await prisma.product.findUnique({
    where: { id: productId, deletedAt: null }
  });
  if (!product) {
    throw new AppError("NOT_FOUND", "Product tidak ditemukan.");
  }
  if (product.inventoryType !== "FINISHED_GOOD") {
    throw new AppError("BAD_REQUEST", "Hanya produk bertipe FINISHED_GOOD yang dapat memiliki resep.");
  }

  // Validasi komponen
  const seenComponents = new Set<string>();
  for (const it of items) {
    if (it.componentProductId === productId) {
      throw new AppError("BAD_REQUEST", "Produk tidak boleh merujuk dirinya sendiri sebagai komponen resep.");
    }
    if (seenComponents.has(it.componentProductId)) {
      throw new AppError("BAD_REQUEST", "Komponen yang sama tidak boleh dimasukkan lebih dari sekali.");
    }
    seenComponents.add(it.componentProductId);

    const comp = await prisma.product.findUnique({
      where: { id: it.componentProductId, deletedAt: null }
    });
    if (!comp) {
      throw new AppError("BAD_REQUEST", "Produk komponen tidak ditemukan.");
    }
    if (!comp.isActive) {
      throw new AppError("BAD_REQUEST", "Produk komponen harus aktif.");
    }
    if (!comp.trackInventory) {
      throw new AppError("BAD_REQUEST", "Produk komponen harus memiliki pelacakan stok aktif.");
    }
    if (comp.inventoryType !== "RAW_MATERIAL" && comp.inventoryType !== "PACKAGING") {
      throw new AppError("BAD_REQUEST", "Produk komponen harus bertipe RAW_MATERIAL atau PACKAGING.");
    }
    const inputUnit = await prisma.unit.findUnique({
      where: { id: it.unitId }
    });
    if (!inputUnit) {
      throw new AppError("BAD_REQUEST", `Satuan input tidak ditemukan.`);
    }
    if (!comp.baseUnit) {
      throw new AppError("BAD_REQUEST", `Produk komponen '${comp.name}' tidak memiliki base unit yang di-set.`);
    }
    if (!validateUnitCompatibility(inputUnit.symbol, comp.baseUnit)) {
      throw new AppError("BAD_REQUEST", `Satuan '${inputUnit.name}' tidak kompatibel dengan base unit komponen '${comp.name}'.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Dapatkan atau buat resep
    let recipe = await tx.recipe.findUnique({ where: { productId } });
    if (!recipe) {
      recipe = await tx.recipe.create({ data: { productId } });
    } else {
      // Hapus item resep lama
      await tx.recipeItem.deleteMany({ where: { recipeId: recipe.id } });
    }

    // 2. Buat item resep baru
    if (items.length > 0) {
      const resolvedItems = [];
      for (const it of items) {
        const comp = await tx.product.findUnique({ where: { id: it.componentProductId } });
        const inputUnit = await tx.unit.findUnique({ where: { id: it.unitId } });
        const normalizedQty = await convertToBaseUnit(comp!.id, it.quantity, inputUnit!.symbol, comp!.baseUnit as any, tx);
        
        const baseUnitSymbol = comp!.baseUnit === "G" ? "GRAM" : comp!.baseUnit === "ML" ? "ML" : "PCS";
        const baseUnitRecord = await tx.unit.findUnique({ where: { symbol: baseUnitSymbol } });
        
        resolvedItems.push({
          recipeId: recipe!.id,
          componentProductId: it.componentProductId,
          quantity: normalizedQty.toString(),
          unitId: baseUnitRecord!.id
        });
      }

      await tx.recipeItem.createMany({
        data: resolvedItems
      });
    }

    return tx.recipe.findUnique({
      where: { id: recipe.id },
      include: { items: { include: { componentProduct: true, unit: true } } }
    });
  });
};

export const getCommittedStockMap = async (tx: any) => {
  const activeOrders = await tx.order.findMany({
    where: {
      status: {
        in: ["NEW", "PREPARING", "READY"],
      },
    },
    include: {
      items: true,
    },
  });

  const products = await tx.product.findMany({
    where: { deletedAt: null },
    include: {
      recipe: {
        include: {
          items: true,
        },
      },
    },
  });
  const productMap = new Map(products.map((p: any) => [p.id, p]));

  const committedMap = new Map<string, number>();
  for (const order of activeOrders) {
    for (const item of order.items) {
      const product = productMap.get(item.productId) as any;
      if (!product) continue;

      if (product.trackInventory) {
        if (product.recipe && product.recipe.items.length > 0) {
          for (const recipeItem of product.recipe.items) {
            const current = committedMap.get(recipeItem.componentProductId) || 0;
            committedMap.set(
              recipeItem.componentProductId,
              current + (Number(item.quantity) * Number(recipeItem.quantity))
            );
          }
        } else {
          const current = committedMap.get(product.id) || 0;
          committedMap.set(product.id, current + Number(item.quantity));
        }
      }
    }
  }
  return committedMap;
};

