import { BaseUnit, PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client-runtime-utils";
import { AppError } from "../utils/errorHandler";
import { prisma } from "./prisma";

const WEIGHT_UNITS = ["g", "gram", "grams", "kg", "kilogram", "kilograms"];
const VOLUME_UNITS = ["ml", "milliliter", "milliliters", "l", "liter", "liters"];
const COUNT_UNITS = ["pcs", "pc", "piece", "pieces", "bottle", "box", "pack", "can", "dos"];

export function getUnitCategory(unit: string): "WEIGHT" | "VOLUME" | "COUNT" | null {
  const normalized = unit.toLowerCase();
  if (WEIGHT_UNITS.includes(normalized)) return "WEIGHT";
  if (VOLUME_UNITS.includes(normalized)) return "VOLUME";
  if (COUNT_UNITS.includes(normalized)) return "COUNT";
  return null;
}

export function validateUnitCompatibility(inputUnit: string, baseUnit: BaseUnit): boolean {
  const category = getUnitCategory(inputUnit);
  if (!category) return false;

  switch (baseUnit) {
    case BaseUnit.G:
      return category === "WEIGHT";
    case BaseUnit.ML:
      return category === "VOLUME";
    case BaseUnit.PCS:
      return category === "COUNT";
    default:
      return false;
  }
}

export async function convertToBaseUnit(
  productId: string,
  quantity: number | Decimal,
  inputUnit: string,
  baseUnit: BaseUnit,
  tx?: PrismaClient | any
): Promise<Decimal> {
  const qty = new Decimal(quantity);
  const normalized = inputUnit.toLowerCase();
  const activeTx = tx ?? prisma;

  const product = await activeTx.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError("NOT_FOUND", "Product not found");
  }

  const conversion = await activeTx.productUnitConversion.findFirst({
    where: {
      productId,
      unit: {
        symbol: { equals: inputUnit, mode: "insensitive" },
      },
    },
    include: { unit: true },
  });

  if (conversion) {
    return qty.mul(conversion.baseQuantity);
  }

  if (!validateUnitCompatibility(inputUnit, baseUnit)) {
    throw new AppError(
      "BAD_REQUEST",
      `Satuan input '${inputUnit}' tidak kompatibel dengan base unit produk '${baseUnit}' dan tidak ada mapping ProductUnitConversion yang tersedia.`
    );
  }

  if (baseUnit === BaseUnit.G) {
    if (normalized === "kg" || normalized === "kilogram" || normalized === "kilograms") {
      return qty.mul(1000);
    }
    return qty;
  }

  if (baseUnit === BaseUnit.ML) {
    if (normalized === "l" || normalized === "liter" || normalized === "liters") {
      return qty.mul(1000);
    }
    return qty;
  }

  return qty;
}

export function formatBaseToDisplay(
  quantity: number | Decimal,
  baseUnit: BaseUnit,
  preferredUnit?: string
): { quantity: number; unit: string } {
  const qty = new Decimal(quantity);

  if (baseUnit === BaseUnit.G) {
    if (preferredUnit) {
      const normPref = preferredUnit.toLowerCase();
      if (normPref === "kg" || normPref === "kilogram" || normPref === "kilograms") {
        return { quantity: qty.div(1000).toNumber(), unit: "kg" };
      }
      return { quantity: qty.toNumber(), unit: "g" };
    }
    if (qty.gte(1000)) {
      return { quantity: qty.div(1000).toNumber(), unit: "kg" };
    }
    return { quantity: qty.toNumber(), unit: "g" };
  }

  if (baseUnit === BaseUnit.ML) {
    if (preferredUnit) {
      const normPref = preferredUnit.toLowerCase();
      if (normPref === "l" || normPref === "liter" || normPref === "liters") {
        return { quantity: qty.div(1000).toNumber(), unit: "L" };
      }
      return { quantity: qty.toNumber(), unit: "ml" };
    }
    if (qty.gte(1000)) {
      return { quantity: qty.div(1000).toNumber(), unit: "L" };
    }
    return { quantity: qty.toNumber(), unit: "ml" };
  }

  if (preferredUnit) {
    return { quantity: qty.toNumber(), unit: preferredUnit };
  }
  return { quantity: qty.toNumber(), unit: "pcs" };
}
