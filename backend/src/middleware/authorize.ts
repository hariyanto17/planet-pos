import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errorHandler";
import { UserRole } from "@prisma/client";

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("UNAUTHORIZED", "Not authenticated"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("FORBIDDEN", "You do not have access to this resource"));
    }

    next();
  };
};
