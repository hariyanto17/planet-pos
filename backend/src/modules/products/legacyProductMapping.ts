export type LegacyProductMappingRecord = {
  id?: string;
  legacyProductId: string;
  targetType: string;
  targetId: string;
  sourceTable?: string | null;
  createdAt?: Date;
  effectiveFrom?: Date | null;
};

export const buildLegacyProductMappingRecord = (input: LegacyProductMappingRecord) => ({
  ...input,
  effectiveFrom: input.effectiveFrom ?? new Date(),
  createdAt: input.createdAt ?? new Date(),
  sourceTable: input.sourceTable ?? "Product",
});

export const resolveLegacyProductTarget = (
  mappings: LegacyProductMappingRecord[],
  targetType: string,
) => {
  if (!Array.isArray(mappings) || mappings.length === 0) {
    return null;
  }

  const matches = mappings.filter((mapping) => mapping.targetType === targetType);
  if (matches.length === 0) {
    return null;
  }

  return matches.sort((a, b) => {
    const aDate = a.effectiveFrom ? new Date(a.effectiveFrom).getTime() : 0;
    const bDate = b.effectiveFrom ? new Date(b.effectiveFrom).getTime() : 0;
    return bDate - aDate;
  })[0];
};
