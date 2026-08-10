import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/errorHandler";

export const selfOrderShiftGuard = async (req: Request, res: Response, next: NextFunction) => {
  const activeShift = await prisma.cashierShift.findFirst({
    where: {
      status: "OPEN",
    },
  });

  if (!activeShift) {
    return next(new AppError("FORBIDDEN", "No active cashier shift"));
  }

  next();
};

export default selfOrderShiftGuard;
