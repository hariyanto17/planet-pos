import { Request, Response } from "express";
import Joi from "joi";
import { prisma } from "../../utils/prisma";
import { Prisma } from "@prisma/client";
import {
  createMaterialSchema,
  updateMaterialSchema,
  createMaterialVariantSchema,
  updateMaterialVariantSchema,
  createSupplierOfferSchema,
  createPackagingConfigurationSchema,
  createPackagingVersionSchema
} from "./validation";
import { AppError } from "../../utils/errorHandler";
import { responseHandler } from "../../utils/responeHandler";

export const getMaterials = async (req: Request, res: Response) => {
  const materials = await prisma.material.findMany({
    include: {
      category: true,
      brand: true,
      variants: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = materials.map((m) => ({
    id: m.id,
    name: m.name,
    baseUnit: m.baseUnit,
    category: m.category,
    brand: m.brand,
    isActive: m.isActive,
    variantsSummary: m.variants.map((v) => `${v.name} (${m.baseUnit})`).join(", "),
    variants: m.variants,
  }));

  return responseHandler.ok(res, formatted);
};

export const getMaterialVariants = async (req: Request, res: Response) => {
  const variants = await prisma.materialVariant.findMany({
    include: {
      material: {
        include: {
          category: true,
          brand: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const formatted = variants.map((v) => ({
    id: v.id,
    name: `${v.material.name} - ${v.name}`,
    sku: v.sku,
    baseUnit: v.material.baseUnit,
    cost: v.cost ? Number(v.cost) : null,
    material: v.material,
  }));

  return responseHandler.ok(res, formatted);
};

export const createMaterial = async (req: Request, res: Response) => {
  const { error, value } = createMaterialSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const material = await tx.material.create({
        data: {
          name: value.name,
          categoryId: value.categoryId,
          brandId: value.brandId || null,
          baseUnit: value.baseUnit,
          description: value.description || null,
          isActive: true,
        },
      });

      let variant = null;
      if (value.variant) {
        if (value.variant.sku) {
          const existingSku = await tx.materialVariant.findUnique({
            where: { sku: value.variant.sku },
          });
          if (existingSku) {
            throw new AppError("BAD_REQUEST", `SKU '${value.variant.sku}' is already in use.`);
          }
        }

        if (value.variant.barcode) {
          const existingBarcode = await tx.materialVariant.findUnique({
            where: { barcode: value.variant.barcode },
          });
          if (existingBarcode) {
            throw new AppError("BAD_REQUEST", `Barcode '${value.variant.barcode}' is already in use.`);
          }
        }

        const purchasePrice = Number(value.variant.purchasePrice);
        const quantityInBaseUnit = Number(value.variant.quantityInBaseUnit);
        const derivedCost = purchasePrice / quantityInBaseUnit;

        variant = await tx.materialVariant.create({
          data: {
            materialId: material.id,
            name: value.variant.name,
            sku: value.variant.sku || null,
            barcode: value.variant.barcode || null,
            quantityInBaseUnit,
            cost: derivedCost,
            isActive: true,
          },
        });

        if (value.variant.supplierId) {
          await tx.supplierOffer.create({
            data: {
              supplierId: value.variant.supplierId,
              materialVariantId: variant.id,
              unitPrice: purchasePrice,
              currency: "IDR",
              isActive: true,
            },
          });
        }
      }

      return { material, variant };
    });

    return responseHandler.created(res, result);
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("BAD_REQUEST", err.message || "Failed to create material.");
  }
};

export const updateMaterial = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updateMaterialSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const existing = await prisma.material.findUnique({
    where: { id },
    include: { variants: true },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", "Material not found.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updatedMaterial = await tx.material.update({
        where: { id },
        data: {
          name: value.name,
          categoryId: value.categoryId,
          brandId: value.brandId !== undefined ? (value.brandId || null) : undefined,
          baseUnit: value.baseUnit,
          description: value.description !== undefined ? (value.description || null) : undefined,
          isActive: value.isActive,
        },
      });

      let updatedVariant = null;
      if (value.variant) {
        let targetVariantId = value.variant.id;
        if (!targetVariantId && existing.variants.length > 0) {
          targetVariantId = existing.variants[0].id;
        }

        if (targetVariantId) {
          const currentVariant = existing.variants.find((v) => v.id === targetVariantId);
          if (!currentVariant) {
            throw new AppError("NOT_FOUND", "Target material variant not found.");
          }

          if (value.variant.sku && value.variant.sku !== currentVariant.sku) {
            const existingSku = await tx.materialVariant.findUnique({
              where: { sku: value.variant.sku },
            });
            if (existingSku) {
              throw new AppError("BAD_REQUEST", `SKU '${value.variant.sku}' is already in use.`);
            }
          }

          if (value.variant.barcode && value.variant.barcode !== currentVariant.barcode) {
            const existingBarcode = await tx.materialVariant.findUnique({
              where: { barcode: value.variant.barcode },
            });
            if (existingBarcode) {
              throw new AppError("BAD_REQUEST", `Barcode '${value.variant.barcode}' is already in use.`);
            }
          }

          let finalCost = currentVariant.cost;
          const purchasePrice = value.variant.purchasePrice !== undefined ? Number(value.variant.purchasePrice) : null;
          const quantityInBaseUnit = value.variant.quantityInBaseUnit !== undefined ? Number(value.variant.quantityInBaseUnit) : null;

          if (purchasePrice !== null && quantityInBaseUnit !== null) {
            finalCost = new Prisma.Decimal(purchasePrice / quantityInBaseUnit);
          }

          updatedVariant = await tx.materialVariant.update({
            where: { id: targetVariantId },
            data: {
              sku: value.variant.sku !== undefined ? (value.variant.sku || null) : undefined,
              barcode: value.variant.barcode !== undefined ? (value.variant.barcode || null) : undefined,
              quantityInBaseUnit: quantityInBaseUnit || undefined,
              cost: finalCost || undefined,
            },
          });

          if (value.variant.supplierId && purchasePrice !== null) {
            const existingOffer = await tx.supplierOffer.findFirst({
              where: {
                supplierId: value.variant.supplierId,
                materialVariantId: targetVariantId,
                isActive: true,
              },
            });

            if (existingOffer) {
              await tx.supplierOffer.update({
                where: { id: existingOffer.id },
                data: { unitPrice: purchasePrice },
              });
            } else {
              await tx.supplierOffer.create({
                data: {
                  supplierId: value.variant.supplierId,
                  materialVariantId: targetVariantId,
                  unitPrice: purchasePrice,
                  currency: "IDR",
                  isActive: true,
                },
              });
            }
          }
        }
      }

      return { material: updatedMaterial, variant: updatedVariant };
    });

    return responseHandler.ok(res, result);
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("BAD_REQUEST", err.message || "Failed to update material.");
  }
};

export const createMaterialVariant = async (req: Request, res: Response) => {
  const { materialId } = req.params;
  const { error, value } = createMaterialVariantSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({
        where: { id: materialId },
      });
      if (!material) {
        throw new AppError("NOT_FOUND", "Parent Material not found.");
      }

      if (value.sku) {
        const existingSku = await tx.materialVariant.findUnique({
          where: { sku: value.sku },
        });
        if (existingSku) {
          throw new AppError("BAD_REQUEST", `SKU '${value.sku}' is already in use.`);
        }
      }

      if (value.barcode) {
        const existingBarcode = await tx.materialVariant.findUnique({
          where: { barcode: value.barcode },
        });
        if (existingBarcode) {
          throw new AppError("BAD_REQUEST", `Barcode '${value.barcode}' is already in use.`);
        }
      }

      if (value.supplierId) {
        const supplier = await tx.supplier.findUnique({
          where: { id: value.supplierId },
        });
        if (!supplier) {
          throw new AppError("NOT_FOUND", "Supplier not found.");
        }
      }

      const purchasePrice = Number(value.purchasePrice);
      const quantityInBaseUnit = Number(value.quantityInBaseUnit);
      const derivedCost = purchasePrice / quantityInBaseUnit;

      const variant = await tx.materialVariant.create({
        data: {
          materialId,
          name: value.name,
          sku: value.sku || null,
          barcode: value.barcode || null,
          quantityInBaseUnit,
          cost: derivedCost,
          isActive: true,
        },
      });

      if (value.supplierId) {
        await tx.supplierOffer.create({
          data: {
            supplierId: value.supplierId,
            materialVariantId: variant.id,
            unitPrice: purchasePrice,
            currency: "IDR",
            isActive: true,
          },
        });
      }

      return variant;
    });

    return responseHandler.created(res, result);
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("BAD_REQUEST", err.message || "Failed to create material variant.");
  }
};

export const updateMaterialVariant = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updateMaterialVariantSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const existing = await prisma.materialVariant.findUnique({
    where: { id },
    include: { material: true, supplierOffers: { where: { isActive: true } } },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Material variant not found.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (value.sku && value.sku !== existing.sku) {
        const duplicateSku = await tx.materialVariant.findUnique({
          where: { sku: value.sku },
        });
        if (duplicateSku) {
          throw new AppError("BAD_REQUEST", `SKU '${value.sku}' is already in use.`);
        }
      }

      if (value.barcode && value.barcode !== existing.barcode) {
        const duplicateBarcode = await tx.materialVariant.findUnique({
          where: { barcode: value.barcode },
        });
        if (duplicateBarcode) {
          throw new AppError("BAD_REQUEST", `Barcode '${value.barcode}' is already in use.`);
        }
      }

      const purchasePrice = value.purchasePrice !== undefined && value.purchasePrice !== null ? Number(value.purchasePrice) : null;
      const quantityInBaseUnit = value.quantityInBaseUnit !== undefined && value.quantityInBaseUnit !== null ? Number(value.quantityInBaseUnit) : null;

      let finalCost = existing.cost;
      if (purchasePrice !== null || quantityInBaseUnit !== null) {
        const pPrice = purchasePrice !== null ? purchasePrice : (existing.supplierOffers[0]?.unitPrice ? Number(existing.supplierOffers[0].unitPrice) : 0);
        const qQty = quantityInBaseUnit !== null ? quantityInBaseUnit : Number(existing.quantityInBaseUnit);
        if (qQty > 0) {
          finalCost = new Prisma.Decimal(pPrice / qQty);
        }
      }

      const updated = await tx.materialVariant.update({
        where: { id },
        data: {
          name: value.name ?? undefined,
          sku: value.sku !== undefined ? (value.sku || null) : undefined,
          barcode: value.barcode !== undefined ? (value.barcode || null) : undefined,
          quantityInBaseUnit: quantityInBaseUnit !== null ? quantityInBaseUnit : undefined,
          cost: finalCost,
          isActive: value.isActive !== undefined ? value.isActive : undefined,
        },
      });

      if (purchasePrice !== null) {
        const existingOffer = await tx.supplierOffer.findFirst({
          where: {
            materialVariantId: id,
            isActive: true,
          },
        });
        if (existingOffer) {
          await tx.supplierOffer.update({
            where: { id: existingOffer.id },
            data: { unitPrice: purchasePrice },
          });
        }
      }

      return updated;
    });

    return responseHandler.ok(res, result);
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError("BAD_REQUEST", err.message || "Failed to update material variant.");
  }
};

export const deleteMaterialVariant = async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.materialVariant.findUnique({
    where: { id },
    include: {
      inventoryStocks: true,
      stockLedgers: true,
      purchaseReceiptItems: true,
      supplierOffers: true,
      packagingConfigurations: true,
    },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", "Material variant not found.");
  }

  const hasReferences =
    existing.inventoryStocks.length > 0 ||
    existing.stockLedgers.length > 0 ||
    existing.purchaseReceiptItems.length > 0 ||
    existing.supplierOffers.length > 0 ||
    existing.packagingConfigurations.length > 0;

  if (hasReferences) {
    const updated = await prisma.materialVariant.update({
      where: { id },
      data: { isActive: false },
    });
    return responseHandler.ok(res, {
      message: "Variant is referenced by other items and was deactivated instead of deleted.",
      variant: updated,
    });
  }

  await prisma.materialVariant.delete({
    where: { id },
  });

  return responseHandler.ok(res, { message: "Material variant deleted successfully." });
};

export const getSupplierOffersByVariant = async (req: Request, res: Response) => {
  const { variantId } = req.params;
  const offers = await prisma.supplierOffer.findMany({
    where: { materialVariantId: variantId },
    include: { supplier: true },
    orderBy: { createdAt: "desc" },
  });
  return responseHandler.ok(res, offers);
};

export const createSupplierOffer = async (req: Request, res: Response) => {
  const { variantId } = req.params;
  const { error, value } = createSupplierOfferSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const variant = await prisma.materialVariant.findUnique({
    where: { id: variantId },
  });
  if (!variant) {
    throw new AppError("NOT_FOUND", "Material variant not found.");
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: value.supplierId },
  });
  if (!supplier) {
    throw new AppError("NOT_FOUND", "Supplier not found.");
  }

  const offer = await prisma.supplierOffer.create({
    data: {
      supplierId: value.supplierId,
      materialVariantId: variantId,
      unitPrice: value.unitPrice,
      currency: value.currency || "IDR",
      isActive: value.isActive ?? true,
    },
  });

  return responseHandler.created(res, offer);
};

export const deleteSupplierOffer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.supplierOffer.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Supplier offer not found.");
  }

  await prisma.supplierOffer.delete({
    where: { id },
  });

  return responseHandler.ok(res, { message: "Supplier offer deleted successfully." });
};

export const getPackagingByVariant = async (req: Request, res: Response) => {
  const { variantId } = req.params;
  const configs = await prisma.packagingConfiguration.findMany({
    where: { materialVariantId: variantId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return responseHandler.ok(res, configs);
};

export const createPackaging = async (req: Request, res: Response) => {
  const { variantId } = req.params;
  const { error, value } = createPackagingConfigurationSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const variant = await prisma.materialVariant.findUnique({
    where: { id: variantId },
  });
  if (!variant) {
    throw new AppError("NOT_FOUND", "Material variant not found.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const config = await tx.packagingConfiguration.create({
      data: {
        materialVariantId: variantId,
        name: value.name,
        unitLabel: value.unitLabel || null,
        isActive: true,
      },
    });

    const conversionFactor = Number(value.conversionFactor);
    const normalizedQuantity = conversionFactor * Number(variant.quantityInBaseUnit);

    const version = await tx.packagingVersion.create({
      data: {
        packagingConfigurationId: config.id,
        versionNumber: 1,
        conversionFactor,
        normalizedToBaseQuantity: normalizedQuantity,
        isActive: true,
      },
    });

    return { ...config, versions: [version] };
  });

  return responseHandler.created(res, result);
};

export const updatePackagingConfiguration = async (req: Request, res: Response) => {
  const { id } = req.params;
  const schema = Joi.object({
    name: Joi.string().trim().optional(),
    unitLabel: Joi.string().allow(null, "").optional(),
    isActive: Joi.boolean().optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const existing = await prisma.packagingConfiguration.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Packaging configuration not found.");
  }

  const updated = await prisma.packagingConfiguration.update({
    where: { id },
    data: {
      name: value.name ?? undefined,
      unitLabel: value.unitLabel !== undefined ? (value.unitLabel || null) : undefined,
      isActive: value.isActive !== undefined ? value.isActive : undefined,
    },
  });

  return responseHandler.ok(res, updated);
};

export const createNewPackagingVersion = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = createPackagingVersionSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const config = await prisma.packagingConfiguration.findUnique({
    where: { id },
    include: { materialVariant: true, versions: true },
  });
  if (!config) {
    throw new AppError("NOT_FOUND", "Packaging configuration not found.");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Expire current active version
    await tx.packagingVersion.updateMany({
      where: {
        packagingConfigurationId: id,
        isActive: true,
        effectiveTo: null,
      },
      data: {
        isActive: false,
        effectiveTo: new Date(),
      },
    });

    const conversionFactor = Number(value.conversionFactor);
    const normalizedQuantity = conversionFactor * Number(config.materialVariant.quantityInBaseUnit);
    const nextVersionNumber = config.versions.length > 0
      ? Math.max(...config.versions.map(v => v.versionNumber)) + 1
      : 1;

    const version = await tx.packagingVersion.create({
      data: {
        packagingConfigurationId: id,
        versionNumber: nextVersionNumber,
        conversionFactor,
        normalizedToBaseQuantity: normalizedQuantity,
        isActive: true,
      },
    });

    return version;
  });

  return responseHandler.created(res, result);
};
