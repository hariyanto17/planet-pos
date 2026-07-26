import { prisma } from "../../utils/prisma";
import { CreateCategoryInput, UpdateCategoryInput } from "./interface";

export const getAllCategories = async () => {
  return prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
};

export const getCategoryById = async (id: string) => {
  return prisma.category.findFirst({
    where: { id, deletedAt: null },
  });
};

export const createCategory = async (input: CreateCategoryInput) => {
  return prisma.category.create({
    data: input,
  });
};

export const updateCategory = async (id: string, input: UpdateCategoryInput) => {
  return prisma.category.update({
    where: { id },
    data: input,
  });
};

export const deleteCategory = async (id: string) => {
  return prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
