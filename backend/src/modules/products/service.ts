import { prisma } from "../../utils/prisma";
import { CreateProductInput, UpdateProductInput } from "./interface";

export const getAllProducts = async () => {
  return prisma.product.findMany({
    where: { deletedAt: null },
    include: { category: true, unit: true },
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
  const data: any = {
    ...input,
    price: input.price.toString(),
  };
  if (input.minimumStock !== undefined && input.minimumStock !== null) {
    data.minimumStock = input.minimumStock.toString();
  }
  return prisma.product.create({
    data,
  });
};

export const updateProduct = async (id: string, input: UpdateProductInput) => {
  const updateData: any = { ...input };
  if (input.price !== undefined) {
    updateData.price = input.price.toString();
  }
  if (input.minimumStock !== undefined && input.minimumStock !== null) {
    updateData.minimumStock = input.minimumStock.toString();
  }
  if (input.trackInventory === false) {
    updateData.inventoryType = null;
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
