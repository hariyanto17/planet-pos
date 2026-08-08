import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as usersService from "./service";
import { createUserSchema, updateUserSchema, resetPasswordSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";
import { prisma } from "../../utils/prisma";

export const getUsers = async (req: Request, res: Response) => {
  const options = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
    role: req.query.role ? String(req.query.role) : undefined,
    isActive: req.query.isActive !== undefined ? String(req.query.isActive) : undefined
  };

  const result = await usersService.getAllUsers(options);
  return responseHandler.ok(res, result);
};

export const createUserHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const { error, value } = createUserSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const user = await usersService.createUser(value);

  await logActivity(req.user.id, "USER_CREATED", "User", user.id, { username: user.username });
  if (user.warehouseId) {
    await logActivity(req.user.id, "USER_WAREHOUSE_ASSIGNED", "User", user.id, { warehouseId: user.warehouseId });
  }

  return responseHandler.created(res, user, "User created successfully");
};

export const updateUserHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const { id } = req.params;
  const { error, value } = updateUserSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  const updated = await usersService.updateUser(req.user.id, id, value);

  if (existing.role !== updated.role) {
    await logActivity(req.user.id, "USER_ROLE_CHANGED", "User", id, { from: existing.role, to: updated.role });
  } else {
    await logActivity(req.user.id, "USER_UPDATED", "User", id);
  }

  // If status changed as part of the update
  if (existing.isActive !== updated.isActive) {
    const action = updated.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED";
    await logActivity(req.user.id, action, "User", id);
  }

  // Log warehouse assignment changes
  if (existing.warehouseId !== updated.warehouseId) {
    if (!existing.warehouseId && updated.warehouseId) {
      await logActivity(req.user.id, "USER_WAREHOUSE_ASSIGNED", "User", id, { warehouseId: updated.warehouseId });
    } else if (existing.warehouseId && !updated.warehouseId) {
      await logActivity(req.user.id, "USER_WAREHOUSE_UNASSIGNED", "User", id, { warehouseId: existing.warehouseId });
    } else if (existing.warehouseId && updated.warehouseId) {
      await logActivity(req.user.id, "USER_WAREHOUSE_CHANGED", "User", id, {
        from: existing.warehouseId,
        to: updated.warehouseId
      });
    }
  }

  return responseHandler.ok(res, updated, "User updated successfully");
};

export const updateUserStatusHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const { id } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined) {
    throw new AppError("BAD_REQUEST", "isActive status is required");
  }

  const updated = await usersService.updateUserStatus(req.user.id, id, isActive);
  const action = isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED";
  await logActivity(req.user.id, action, "User", id);

  return responseHandler.ok(res, updated, `User ${isActive ? "activated" : "deactivated"} successfully`);
};

export const resetUserPasswordHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const { id } = req.params;
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  await usersService.resetUserPassword(id, value);

  await logActivity(req.user.id, "USER_PASSWORD_RESET", "User", id);

  return responseHandler.ok(res, null, "User password reset successfully");
};
