import { prisma } from "../../utils/prisma";
import { CreateTableInput, UpdateTableInput } from "./interface";

export const getAllTables = async () => {
  return prisma.table.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
  });
};

export const getTableById = async (id: string) => {
  return prisma.table.findFirst({
    where: { id, deletedAt: null },
  });
};

export const createTable = async (input: CreateTableInput) => {
  return prisma.table.create({
    data: input,
  });
};

export const updateTable = async (id: string, input: UpdateTableInput) => {
  return prisma.table.update({
    where: { id },
    data: input,
  });
};

export const deleteTable = async (id: string) => {
  return prisma.table.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
