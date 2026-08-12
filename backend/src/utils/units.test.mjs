import test from 'node:test';
import assert from 'node:assert/strict';
import { BaseUnit } from '@prisma/client';
import { convertToBaseUnit } from './units.ts';

test('convertToBaseUnit uses product-specific conversions when available', async () => {
  const fakeTx = {
    product: {
      findUnique: async () => ({ id: 'p1' }),
    },
    productUnitConversion: {
      findFirst: async () => ({
        baseQuantity: 12,
        unit: { symbol: 'dos' },
      }),
    },
  };

  const result = await convertToBaseUnit('p1', 3, 'dos', BaseUnit.PCS, fakeTx);
  assert.equal(result.toString(), '36');
});

test('convertToBaseUnit converts kilograms and liters to base units', async () => {
  const fakeTx = {
    product: {
      findUnique: async () => ({ id: 'p2' }),
    },
    productUnitConversion: {
      findFirst: async () => null,
    },
  };

  const grams = await convertToBaseUnit('p2', 2, 'kg', BaseUnit.G, fakeTx);
  const milliliters = await convertToBaseUnit('p2', 1.5, 'l', BaseUnit.ML, fakeTx);

  assert.equal(grams.toString(), '2000');
  assert.equal(milliliters.toString(), '1500');
});
