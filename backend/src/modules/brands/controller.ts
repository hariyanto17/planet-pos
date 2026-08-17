import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { createBrandSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { responseHandler } from "../../utils/responeHandler";

export const getBrands = async (req: Request, res: Response) => {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return responseHandler.ok(res, brands);
};

export const createBrand = async (req: Request, res: Response) => {
  const { error, value } = createBrandSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const existing = await prisma.brand.findUnique({
    where: { name: value.name },
  });
  if (existing) {
    throw new AppError("BAD_REQUEST", "Brand name already exists.");
  }

  const brand = await prisma.brand.create({
    data: {
      name: value.name,
      isActive: value.isActive ?? true,
    },
  });

  return responseHandler.created(res, brand);
};
