export interface ProductUnitConversion {
  id: string;
  unit: string;
  unitName?: string;
  baseQuantity: string;
  isDefault?: boolean;
}

export interface Product {
  id: string;
  name: string;
  baseUnit?: string | null;
  unit?: { name: string; symbol: string } | null;
  unitConversions?: ProductUnitConversion[];
}

export const getAvailableUnits = (product?: Product | null): Array<{ symbol: string; baseQuantity: string; isDefault?: boolean }> => {
  if (!product) return [];

  const baseUnit = product.baseUnit;
  if (!baseUnit) return [];

  const baseUnitEntry = { symbol: baseUnit, baseQuantity: "1", isDefault: true };

  if (product.unitConversions && product.unitConversions.length > 0) {
    const conversions = product.unitConversions
      .filter((c) => c.unit && c.unit !== baseUnit)
      .map((c) => ({
        symbol: c.unit,
        baseQuantity: c.baseQuantity,
        isDefault: c.isDefault,
      }));

    const hasDefault = conversions.some((c) => c.isDefault);
    if (!hasDefault && conversions.length > 0) {
      conversions[0].isDefault = true;
    }

    return [baseUnitEntry, ...conversions];
  }

  return [baseUnitEntry];
};

export const getConversionForUnit = (product?: Product | null, unitSymbol?: string): ProductUnitConversion | null => {
  if (!product || !unitSymbol) return null;

  if (unitSymbol === product.baseUnit) {
    return { id: "base", unit: product.baseUnit, baseQuantity: "1", isDefault: true };
  }

  const conversion = product.unitConversions?.find((c) => c.unit === unitSymbol);
  return conversion || null;
};

export const formatConversionPreview = (product?: Product | null, quantity?: number, unitSymbol?: string): string | null => {
  if (!product || !quantity || quantity <= 0 || !unitSymbol) return null;

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
