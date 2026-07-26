import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as dashboardService from "./service";
import { AppError } from "../../utils/errorHandler";

export const getDashboardStatsHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  // Authorization check for Admin or Accounting
  if (req.user.role !== "ADMIN" && req.user.role !== "ACCOUNTING") {
    throw new AppError("FORBIDDEN", "Forbidden from dashboard metrics access");
  }

  const stats = await dashboardService.getDashboardStats();
  return responseHandler.ok(res, stats);
};
