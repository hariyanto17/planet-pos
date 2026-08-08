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
