import { prisma } from "../../utils/prisma";

export type CreateBrandInput = {
  name: string;
  isActive?: boolean;
};

export type CreateMaterialInput = {
  brandId?: string | null;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type CreateMaterialVariantInput = {
  materialId: string;
  name: string;
  variantCode?: string | null;
  contentQuantity?: number | string | null;
  contentUnit?: string | null;
  baseUnit?: "G" | "ML" | "PCS" | null;
  sku?: string | null;
  barcode?: string | null;
  isActive?: boolean;
};

export type CreateSellableProductInput = {
  name: string;
  sku?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  productType?: "DIRECT_SALE" | "RECIPE_BASED";
  price?: number | string | null;
  isActive?: boolean;
};

export type CreateInventoryStockInput = {
  warehouseId: string;
  materialVariantId: string;
  quantity?: number | string | null;
};

export const normalizeBrandInput = (input: CreateBrandInput) => {
  if (!input.name || input.name.trim() === "") {
    throw new Error("Brand name is required.");
  }

  return {
    name: input.name.trim(),
    isActive: input.isActive ?? true,
  };
};

export const normalizeMaterialInput = (input: CreateMaterialInput) => {
  if (!input.name || input.name.trim() === "") {
    throw new Error("Material name is required.");
  }

  return {
    brandId: input.brandId ?? null,
    categoryId: input.categoryId ?? null,
    name: input.name.trim(),
    description: input.description ?? null,
    isActive: input.isActive ?? true,
  };
};

export const normalizeMaterialVariantInput = (input: CreateMaterialVariantInput) => {
  if (!input.materialId) {
    throw new Error("Material variant requires a materialId.");
  }

  if (!input.name || input.name.trim() === "") {
    throw new Error("Material variant name is required.");
  }

  return {
    materialId: input.materialId,
    name: input.name.trim(),
    variantCode: input.variantCode ?? null,
    contentQuantity:
      input.contentQuantity !== undefined && input.contentQuantity !== null
        ? input.contentQuantity.toString()
        : null,
    contentUnit: input.contentUnit ?? null,
    baseUnit: input.baseUnit ?? "PCS",
    sku: input.sku ?? null,
    barcode: input.barcode ?? null,
    isActive: input.isActive ?? true,
  };
};

export const normalizeSellableProductInput = (input: CreateSellableProductInput) => {
  if (!input.name || input.name.trim() === "") {
    throw new Error("Sellable product name is required.");
  }

  const sku = input.sku && input.sku.trim() !== "" ? input.sku.trim() : undefined;

  return {
    name: input.name.trim(),
    sku: sku ?? undefined,
    categoryId: input.categoryId ?? null,
    brandId: input.brandId ?? null,
    productType: input.productType ?? "DIRECT_SALE",
    price:
      input.price !== undefined && input.price !== null
        ? input.price.toString()
        : null,
    isActive: input.isActive ?? true,
  };
};

export const normalizeInventoryStockInput = (input: CreateInventoryStockInput) => {
  if (!input.warehouseId) {
    throw new Error("Warehouse id is required for inventory stock.");
  }

  if (!input.materialVariantId) {
    throw new Error("Material variant id is required for inventory stock.");
  }

  return {
    warehouseId: input.warehouseId,
    materialVariantId: input.materialVariantId,
    quantity:
      input.quantity !== undefined && input.quantity !== null
        ? input.quantity.toString()
        : "0",
  };
};

export const createBrand = async (input: CreateBrandInput) => {
  return prisma.brand.create({
    data: normalizeBrandInput(input),
  });
};

export const createMaterial = async (input: CreateMaterialInput) => {
  return prisma.material.create({
    data: normalizeMaterialInput(input),
  });
};

export const createMaterialVariant = async (input: CreateMaterialVariantInput) => {
  return prisma.materialVariant.create({
    data: normalizeMaterialVariantInput(input),
  });
};

export const createSellableProduct = async (input: CreateSellableProductInput) => {
  return prisma.sellableProduct.create({
    data: normalizeSellableProductInput(input),
  });
};

export const createInventoryStock = async (input: CreateInventoryStockInput) => {
  return prisma.inventoryStock.upsert({
    where: {
      warehouseId_materialVariantId: {
        warehouseId: input.warehouseId,
        materialVariantId: input.materialVariantId,
      },
    },
    create: normalizeInventoryStockInput(input),
    update: normalizeInventoryStockInput(input),
  });
};
