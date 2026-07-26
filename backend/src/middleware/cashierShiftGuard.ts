import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/errorHandler";

export const cashierShiftGuard = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return next();
  }

  if (user.role === "CASHIER" || user.role === "ADMIN") {
    const activeShift = await prisma.cashierShift.findFirst({
      where: {
        userId: user.id,
        status: "OPEN",
      },
    });

    if (!activeShift) {
      return next(new AppError("FORBIDDEN", "No active cashier shift"));
    }

    req.cashierShift = activeShift;
  }
  next();
};
export default cashierShiftGuard;
