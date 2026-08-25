import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as authService from "./service";
import { loginSchema, changePasswordSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const changePasswordHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const { error, value } = changePasswordSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  await authService.changePassword(req.user.id, value);

  await logActivity(req.user.id, "USER_PASSWORD_CHANGED", "User", req.user.id);

  return responseHandler.ok(res, null, "Password changed successfully");
};

export const loginHandler = async (req: Request, res: Response) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const result = await authService.login(value);
  
  // Log login action
  await logActivity(result.user.id, "LOGIN", "User", result.user.id, { username: result.user.username });

  return responseHandler.ok(res, result, "Login successful");
};

export const getMeHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }
  return responseHandler.ok(res, req.user, "Current user context retrieved");
};

export const ssoCallbackHandler = async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    throw new AppError("BAD_REQUEST", "SSO exchange code is required");
  }

  const result = await authService.ssoLogin(code);

  await logActivity(result.user.id, "LOGIN", "User", result.user.id, {
    username: result.user.username,
    method: "SSO",
  });

  return responseHandler.ok(res, result, "SSO Login successful");
};

export const ssoSyncHandler = async (req: Request, res: Response) => {
  const { platformUserId, status, role } = req.body;
  if (!platformUserId) {
    throw new AppError("BAD_REQUEST", "platformUserId is required");
  }

  const { prisma } = require("../../utils/prisma");
  const localUser = await prisma.user.findUnique({
    where: { platformUserId },
  });

  if (localUser) {
    const isActive = status === "ACTIVE" && role !== null;
    const data: any = { isActive };
    if (role) {
      data.role = role === "CONCESSION_ADMINISTRATOR" ? "ADMIN" : "CASHIER";
    }
    await prisma.user.update({
      where: { id: localUser.id },
      data,
    });
  }

  return responseHandler.ok(res, null, "User status and role synced successfully");
};
