import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";

interface CreateWarehouseInput {
  code: string;
  name: string;
  warehouseType?: "SALES" | "KITCHEN_STORAGE" | "GENERAL";
  isDefaultKitchenStorage?: boolean;
}

interface UpdateWarehouseInput {
  code?: string;
  name?: string;
  warehouseType?: "SALES" | "KITCHEN_STORAGE" | "GENERAL";
  isDefaultKitchenStorage?: boolean;
  isActive?: boolean;
}

interface WarehouseListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const getWarehousesList = async (filters: WarehouseListFilters) => {
  const page = Number(filters.page || 1);
  const limit = Number(filters.limit || 10);
  const skip = (page - 1) * limit;
  const search = filters.search || "";
  const sortBy = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder || "desc";

  const whereClause: any = {};

  if (search) {
    whereClause.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  const total = await prisma.warehouse.count({ where: whereClause });

  const data = await prisma.warehouse.findMany({
    where: whereClause,
    orderBy: { [sortBy]: sortOrder },
    skip,
    take: limit,
  });

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getWarehouseById = async (id: string) => {
  return await prisma.warehouse.findUnique({
    where: { id },
  });
};

export const createWarehouse = async (input: CreateWarehouseInput) => {
  // Check duplicates
  const existingCode = await prisma.warehouse.findFirst({
    where: { code: { equals: input.code, mode: "insensitive" } },
  });
  if (existingCode) {
    throw new AppError("BAD_REQUEST", "Warehouse code already exists");
  }

  const warehouseType = input.warehouseType || "SALES";
  const isDefaultKitchenStorage = input.isDefaultKitchenStorage || false;

  if (isDefaultKitchenStorage && warehouseType !== "KITCHEN_STORAGE") {
    throw new AppError(
      "BAD_REQUEST",
      "Default kitchen storage warehouse must use warehouseType KITCHEN_STORAGE"
    );
  }

  if (isDefaultKitchenStorage) {
    const existingDefault = await prisma.warehouse.findFirst({
      where: { isDefaultKitchenStorage: true },
    });
    if (existingDefault) {
      throw new AppError(
        "BAD_REQUEST",
        "Another warehouse is already marked as default kitchen storage"
      );
    }
  }

  return await prisma.warehouse.create({
    data: {
      code: input.code,
      name: input.name,
      warehouseType,
      isDefaultKitchenStorage,
      isActive: true,
    },
  });
};

export const updateWarehouse = async (id: string, input: UpdateWarehouseInput) => {
  const existing = await prisma.warehouse.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Warehouse not found");
  }

  // Check unique constraints if code changed
  if (input.code && input.code.toLowerCase() !== existing.code.toLowerCase()) {
    const dupCode = await prisma.warehouse.findFirst({
      where: { code: { equals: input.code, mode: "insensitive" } },
    });
    if (dupCode) {
      throw new AppError("BAD_REQUEST", "Warehouse code already exists");
    }
  }

  const updatedWarehouseType = input.warehouseType ?? existing.warehouseType;
  const updatedIsDefaultKitchenStorage =
    input.isDefaultKitchenStorage !== undefined
      ? input.isDefaultKitchenStorage
      : existing.isDefaultKitchenStorage;

  if (updatedIsDefaultKitchenStorage && updatedWarehouseType !== "KITCHEN_STORAGE") {
    throw new AppError(
      "BAD_REQUEST",
      "Default kitchen storage warehouse must use warehouseType KITCHEN_STORAGE"
    );
  }

  if (updatedIsDefaultKitchenStorage) {
    const existingDefault = await prisma.warehouse.findFirst({
      where: { isDefaultKitchenStorage: true, id: { not: id } },
    });
    if (existingDefault) {
      throw new AppError(
        "BAD_REQUEST",
        "Another warehouse is already marked as default kitchen storage"
      );
    }
  }

  // Legacy warehouse stock constraint removed; the canonical inventory model stores stock per warehouse/material variant.

  return await prisma.warehouse.update({
    where: { id },
    data: {
      ...input,
      warehouseType: input.warehouseType,
      isDefaultKitchenStorage: input.isDefaultKitchenStorage,
    },
  });
};

export const deactivateWarehouse = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.warehouse.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Warehouse not found");
    }

    return await tx.warehouse.update({
      where: { id },
      data: { isActive: false },
    });
  });
};
