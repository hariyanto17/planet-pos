import { prisma } from "../../utils/prisma";
import { CreateTaxInput, UpdateTaxInput } from "./interface";

export const getAllTaxes = async () => {
  return prisma.tax.findMany({
    orderBy: { createdAt: "desc" },
  });
};

export const getTaxById = async (id: string) => {
  return prisma.tax.findUnique({
    where: { id },
  });
};

export const createTax = async (input: CreateTaxInput) => {
  return prisma.tax.create({
    data: {
      ...input,
      percentage: input.percentage.toString(),
    },
  });
};

export const updateTax = async (id: string, input: UpdateTaxInput) => {
  const updateData: any = { ...input };
  if (input.percentage !== undefined) {
    updateData.percentage = input.percentage.toString();
  }
  return prisma.tax.update({
    where: { id },
    data: updateData,
  });
};

export const deleteTax = async (id: string) => {
  return prisma.tax.delete({
    where: { id },
  });
};
