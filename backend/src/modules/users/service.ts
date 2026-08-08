import bcrypt from "bcryptjs";
import { PrismaClient, UserRole, Prisma } from "@prisma/client";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { SALT_ROUNDS } from "../../config/constant";

export interface UserQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: string;
}

export const getAllUsers = async (options: UserQueryOptions = {}) => {
  const page = Number(options.page) || 1;
  const limit = Math.min(Number(options.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (options.role) {
    where.role = options.role as UserRole;
  }

  if (options.isActive !== undefined && options.isActive !== "") {
    where.isActive = options.isActive === "true";
  }

  if (options.search) {
    const s = options.search.trim();
    where.OR = [
      { fullName: { contains: s, mode: "insensitive" } },
      { username: { contains: s, mode: "insensitive" } }
    ];
  }

  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        warehouseId: true,
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
            warehouseType: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: users,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages
    }
  };
};

const validateWarehouseAssignment = async (role: UserRole, warehouseId?: string | null) => {
  if (role === UserRole.WAREHOUSE) {
    if (!warehouseId) {
      throw new AppError("BAD_REQUEST", "Penugasan gudang wajib diisi untuk peran WAREHOUSE.");
    }
    const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!wh) {
      throw new AppError("BAD_REQUEST", "Gudang yang ditugaskan tidak ditemukan.");
    }
    if (!wh.isActive) {
      throw new AppError("BAD_REQUEST", "Gudang yang ditugaskan harus aktif.");
    }
  }
};

export const createUser = async (payload: any) => {
  const existing = await prisma.user.findUnique({
    where: { username: payload.username }
  });
  if (existing) {
    throw new AppError("BAD_REQUEST", "Username already exists.");
  }

  const role = payload.role as UserRole;
  const warehouseId = role === UserRole.WAREHOUSE ? payload.warehouseId : null;

  await validateWarehouseAssignment(role, warehouseId);

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      fullName: payload.fullName,
      username: payload.username,
      passwordHash,
      role,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      warehouseId
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
      warehouseId: true
    }
  });

  return user;
};

const checkLastAdminConstraint = async (userId: string, newRole?: UserRole, newActive?: boolean) => {
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  // If the target user is currently an ADMIN, and we are downgrading them or deactivating them
  if (targetUser.role === UserRole.ADMIN) {
    const isDowngradingStatus = newActive === false;
    const isDowngradingRole = newRole !== undefined && newRole !== UserRole.ADMIN;

    if (isDowngradingStatus || isDowngradingRole) {
      // Count how many other active ADMINs exist
      const activeAdminsCount = await prisma.user.count({
        where: {
          role: UserRole.ADMIN,
          isActive: true,
          id: { not: userId }
        }
      });

      if (activeAdminsCount === 0) {
        throw new AppError("BAD_REQUEST", "Cannot deactivate or downgrade the last active administrator.");
      }
    }
  }
};

export const updateUser = async (adminUserId: string, userId: string, payload: any) => {
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  // Username uniqueness check
  if (payload.username && payload.username !== targetUser.username) {
    const existing = await prisma.user.findUnique({ where: { username: payload.username } });
    if (existing) {
      throw new AppError("BAD_REQUEST", "Username already exists.");
    }
  }

  // Self-lockout check: an ADMIN cannot deactivate themselves or change their own role to non-admin
  if (adminUserId === userId) {
    if (payload.isActive === false) {
      throw new AppError("BAD_REQUEST", "You cannot deactivate your own account.");
    }
    if (payload.role && payload.role !== UserRole.ADMIN) {
      throw new AppError("BAD_REQUEST", "You cannot change your own administrator role.");
    }
  }

  // Protect the last active admin
  await checkLastAdminConstraint(userId, payload.role, payload.isActive);

  const role = payload.role as UserRole;
  const warehouseId = role === UserRole.WAREHOUSE ? payload.warehouseId : null;

  await validateWarehouseAssignment(role, warehouseId);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: payload.fullName,
      username: payload.username,
      role,
      isActive: payload.isActive,
      warehouseId
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      warehouseId: true
    }
  });

  return updated;
};

export const updateUserStatus = async (adminUserId: string, userId: string, isActive: boolean) => {
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  if (adminUserId === userId && !isActive) {
    throw new AppError("BAD_REQUEST", "You cannot deactivate your own account.");
  }

  // Protect the last active admin
  await checkLastAdminConstraint(userId, undefined, isActive);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      isActive: true
    }
  });

  return updated;
};

export const resetUserPassword = async (userId: string, payload: any) => {
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });
};
