import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { createSupplierSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { responseHandler } from "../../utils/responeHandler";

export const getSuppliers = async (req: Request, res: Response) => {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
  });
  return responseHandler.ok(res, suppliers);
};

export const getSupplierById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
  });
  if (!supplier) {
    throw new AppError("NOT_FOUND", "Supplier not found.");
  }
  return responseHandler.ok(res, supplier);
};

export const createSupplier = async (req: Request, res: Response) => {
  const { error, value } = createSupplierSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  if (value.code) {
    const existing = await prisma.supplier.findUnique({
      where: { code: value.code },
    });
    if (existing) {
      throw new AppError("BAD_REQUEST", `Supplier code '${value.code}' is already in use.`);
    }
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: value.name,
      code: value.code || null,
      isActive: value.isActive ?? true,
    },
  });

  return responseHandler.created(res, supplier);
};

export const updateSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = createSupplierSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const existing = await prisma.supplier.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Supplier not found.");
  }

  if (value.code && value.code !== existing.code) {
    const existingCode = await prisma.supplier.findUnique({
      where: { code: value.code },
    });
    if (existingCode) {
      throw new AppError("BAD_REQUEST", `Supplier code '${value.code}' is already in use.`);
    }
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name: value.name,
      code: value.code || null,
      isActive: value.isActive ?? true,
    },
  });

  return responseHandler.ok(res, supplier);
};

export const deleteSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.supplier.findUnique({
    where: { id },
    include: {
      offers: true,
      receipts: true,
    },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", "Supplier not found.");
  }

  // Soft delete / deactivate if referenced
  if (existing.offers.length > 0 || existing.receipts.length > 0) {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
    return responseHandler.ok(res, {
      message: "Supplier has active offers or receipts and was deactivated instead of deleted.",
      supplier,
    });
  }

  await prisma.supplier.delete({
    where: { id },
  });

  return responseHandler.ok(res, { message: "Supplier deleted successfully." });
};
