import { prisma } from "../../utils/prisma";
import { CreateProductInput, UpdateProductInput } from "./interface";

export const getAllProducts = async () => {
  return prisma.product.findMany({
    where: { deletedAt: null },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
};

export const getProductById = async (id: string) => {
  return prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: { category: true },
  });
};

export const createProduct = async (input: CreateProductInput) => {
  return prisma.product.create({
    data: {
      ...input,
      price: input.price.toString(),
    },
  });
};

export const updateProduct = async (id: string, input: UpdateProductInput) => {
  const updateData: any = { ...input };
  if (input.price !== undefined) {
    updateData.price = input.price.toString();
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
