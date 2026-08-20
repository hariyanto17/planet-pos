export interface ProductUnitConversion {
  id?: string;
  unit: string;
  unitName?: string;
  baseQuantity: number | string;
  isDefault?: boolean;
}

export interface Product {
  id: string;
  name: string;
  baseUnit?: string | null;
  unit?: { name: string; symbol: string } | null;
  unitConversions?: ProductUnitConversion[];
  materialVariantId?: string;
  materialId?: string;
}

export const getAvailableUnits = (product?: Product | null): Array<{ symbol: string; baseQuantity: string; isDefault?: boolean }> => {
  if (!product) return [];

  const baseUnit = product.baseUnit;
  if (!baseUnit) return [];

  const baseUnitEntry = { symbol: baseUnit, baseQuantity: "1", isDefault: true };
  const units: Array<{ symbol: string; baseQuantity: string; isDefault?: boolean }> = [baseUnitEntry];

  // Add standard units based on baseUnit category if not already explicitly configured
  const upperBase = baseUnit.toUpperCase();
  if (upperBase === "ML") {
    units.push({ symbol: "LITER", baseQuantity: "1000", isDefault: false });
  } else if (upperBase === "G") {
    units.push({ symbol: "KG", baseQuantity: "1000", isDefault: false });
  }

  if (product.unitConversions && product.unitConversions.length > 0) {
    const conversions = product.unitConversions
      .filter((c) => c.unit && c.unit !== baseUnit)
      .map((c) => ({
        symbol: c.unit,
        baseQuantity: String(c.baseQuantity),
        isDefault: c.isDefault,
      }));

    conversions.forEach((c) => {
      if (!units.some((u) => u.symbol.toUpperCase() === c.symbol.toUpperCase())) {
        units.push(c);
      }
    });

    const hasDefault = units.some((c) => c.isDefault);
    if (!hasDefault && units.length > 0) {
      units[0].isDefault = true;
    }
  }

  return units;
};

export const getConversionForUnit = (product?: Product | null, unitSymbol?: string): ProductUnitConversion | null => {
  if (!product || !unitSymbol) return null;

  const upperUnit = unitSymbol.toUpperCase();
  const upperBase = product.baseUnit?.toUpperCase();

  if (upperUnit === upperBase) {
    return { id: "base", unit: product.baseUnit || "", baseQuantity: "1", isDefault: true };
  }

  // Standard conversions
  if (upperBase === "ML" && (upperUnit === "L" || upperUnit === "LITER" || upperUnit === "LITERS")) {
    return { id: "liter", unit: unitSymbol, baseQuantity: "1000", isDefault: false };
  }
  if (upperBase === "G" && (upperUnit === "KG" || upperUnit === "KILOGRAM" || upperUnit === "KILOGRAMS")) {
    return { id: "kg", unit: unitSymbol, baseQuantity: "1000", isDefault: false };
  }

  const conversion = product.unitConversions?.find((c) => c.unit.toUpperCase() === upperUnit);
  return conversion || null;
};

export const formatConversionPreview = (product?: Product | null, quantity?: number, unitSymbol?: string): string | null => {
  if (!product || !quantity || quantity === 0 || !unitSymbol) return null;

  const conversion = getConversionForUnit(product, unitSymbol);
  if (!conversion) return null;

  const baseQty = Number(conversion.baseQuantity) * quantity;
  const baseUnitName = product.baseUnit === "G" ? "g" : product.baseUnit === "ML" ? "ml" : product.baseUnit?.toLowerCase() || "pcs";

  return `${quantity} ${unitSymbol} = ${baseQty.toLocaleString("id-ID")} ${baseUnitName}`;
};

export const getDefaultUnit = (product?: Product | null): string => {
  const units = getAvailableUnits(product);
  const defaultUnit = units.find((u) => u.isDefault);
  return defaultUnit?.symbol || units[0]?.symbol || "";
};
