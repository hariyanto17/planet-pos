import { prisma } from "../../utils/prisma";
import { CreatePromotionInput, UpdatePromotionInput } from "./interface";
import { Prisma } from "@prisma/client";

export const getAllPromotions = async () => {
  return prisma.promotion.findMany({
    where: { deletedAt: null },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const getPromotionById = async (id: string) => {
  return prisma.promotion.findFirst({
    where: { id, deletedAt: null },
    include: { items: { include: { product: true } } },
  });
};

export const createPromotion = async (createdById: string, input: CreatePromotionInput) => {
  const { items, ...promoDetails } = input;
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const promotion = await tx.promotion.create({
      data: {
        ...promoDetails,
        createdById,
        percentValue: input.percentValue ? input.percentValue.toString() : null,
        packagePrice: input.packagePrice ? input.packagePrice.toString() : null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
    });

    if (items && items.length > 0) {
      await tx.promotionItem.createMany({
        data: items.map((item) => ({
          promotionId: promotion.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
    }

    return tx.promotion.findUnique({
      where: { id: promotion.id },
      include: { items: { include: { product: true } } },
    });
  });
};

export const updatePromotion = async (id: string, input: UpdatePromotionInput) => {
  const { items, ...promoDetails } = input;
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updateData: any = { ...promoDetails };
    if (input.percentValue !== undefined) {
      updateData.percentValue = input.percentValue ? input.percentValue.toString() : null;
    }
    if (input.packagePrice !== undefined) {
      updateData.packagePrice = input.packagePrice ? input.packagePrice.toString() : null;
    }
    if (input.startDate !== undefined) {
      updateData.startDate = input.startDate ? new Date(input.startDate) : null;
    }
    if (input.endDate !== undefined) {
      updateData.endDate = input.endDate ? new Date(input.endDate) : null;
    }

    await tx.promotion.update({
      where: { id },
      data: updateData,
    });

    if (items !== undefined) {
      // Clear existing items and create new ones
      await tx.promotionItem.deleteMany({
        where: { promotionId: id },
      });

      if (items.length > 0) {
        await tx.promotionItem.createMany({
          data: items.map((item) => ({
            promotionId: id,
            productId: item.productId,
            quantity: item.quantity,
          })),
        });
      }
    }

    return tx.promotion.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
  });
};

export const deletePromotion = async (id: string) => {
  return prisma.promotion.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
