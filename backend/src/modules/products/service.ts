import { prisma } from "../../utils/prisma";
import { CreateProductInput, UpdateProductInput } from "./interface";
import { AppError } from "../../utils/errorHandler";

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
  return prisma.product.findMany({
    where: whereClause,
    include: { 
      category: true, 
      unit: true,
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
};

export const getProductById = async (id: string) => {
  return prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: { category: true, unit: true },
  });
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
    updateData.sku = `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  if (input.trackInventory === false) {
    updateData.inventoryType = "FINISHED_GOOD";
    updateData.unitId = null;
    updateData.minimumStock = null;
  }
  return prisma.product.update({
    where: { id },
    data: updateData,
  });
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
    if (comp.unitId !== it.unitId) {
      throw new AppError("BAD_REQUEST", `Satuan untuk komponen '${comp.name}' harus sesuai dengan satuan stoknya.`);
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
      await tx.recipeItem.createMany({
        data: items.map((it) => ({
          recipeId: recipe!.id,
          componentProductId: it.componentProductId,
          quantity: it.quantity.toString(),
          unitId: it.unitId
        }))
      });
    }

    return tx.recipe.findUnique({
      where: { id: recipe.id },
      include: { items: { include: { componentProduct: true, unit: true } } }
    });
  });
};
