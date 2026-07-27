import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";

interface CreateUnitInput {
  name: string;
  symbol: string;
}

interface UpdateUnitInput {
  name?: string;
  symbol?: string;
  isActive?: boolean;
}

interface UnitListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const getUnitsList = async (filters: UnitListFilters) => {
  const page = Number(filters.page || 1);
  const limit = Number(filters.limit || 10);
  const skip = (page - 1) * limit;
  const search = filters.search || "";
  const sortBy = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder || "desc";

  const whereClause: any = {};

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { symbol: { contains: search, mode: "insensitive" } },
    ];
  }

  const total = await prisma.unit.count({ where: whereClause });

  const data = await prisma.unit.findMany({
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

export const getUnitById = async (id: string) => {
  return await prisma.unit.findUnique({
    where: { id },
  });
};

export const createUnit = async (input: CreateUnitInput) => {
  // Check duplicates
  const existingName = await prisma.unit.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
  });
  if (existingName) {
    throw new AppError("BAD_REQUEST", "Unit name already exists");
  }

  const existingSymbol = await prisma.unit.findFirst({
    where: { symbol: { equals: input.symbol, mode: "insensitive" } },
  });
  if (existingSymbol) {
    throw new AppError("BAD_REQUEST", "Unit symbol already exists");
  }

  return await prisma.unit.create({
    data: {
      name: input.name,
      symbol: input.symbol,
      isActive: true,
    },
  });
};

export const updateUnit = async (id: string, input: UpdateUnitInput) => {
  const existing = await prisma.unit.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Unit not found");
  }

  // Check unique constraints if name/symbol changed
  if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
    const dupName = await prisma.unit.findFirst({
      where: { name: { equals: input.name, mode: "insensitive" } },
    });
    if (dupName) {
      throw new AppError("BAD_REQUEST", "Unit name already exists");
    }
  }

  if (input.symbol && input.symbol.toLowerCase() !== existing.symbol.toLowerCase()) {
    const dupSymbol = await prisma.unit.findFirst({
      where: { symbol: { equals: input.symbol, mode: "insensitive" } },
    });
    if (dupSymbol) {
      throw new AppError("BAD_REQUEST", "Unit symbol already exists");
    }
  }

  // If attempting to deactivate via PUT
  if (input.isActive === false && existing.isActive) {
    const productCount = await prisma.product.count({
      where: { unitId: id, deletedAt: null },
    });
    if (productCount > 0) {
      throw new AppError("BAD_REQUEST", "Cannot deactivate Unit because it is currently used by one or more products.");
    }
  }

  return await prisma.unit.update({
    where: { id },
    data: input,
  });
};

export const deactivateUnit = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.unit.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Unit not found");
    }

    // Check if any product references this unit
    const productCount = await tx.product.count({
      where: { unitId: id, deletedAt: null },
    });
    if (productCount > 0) {
      throw new AppError("BAD_REQUEST", "Cannot deactivate Unit because it is currently used by one or more products.");
    }

    return await tx.unit.update({
      where: { id },
      data: { isActive: false },
    });
  });
};
