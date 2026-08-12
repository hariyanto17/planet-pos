import test from 'node:test';
import assert from 'node:assert/strict';
import { BaseUnit } from '@prisma/client';
import { convertToBaseUnit } from './units';

test('converts DOS and BOTTLE through product-specific mappings', async () => {
  const fakeTx = {
    product: { findUnique: async () => ({ id: 'milk' }) },
    productUnitConversion: {
      findFirst: async ({ where }: any) => {
        const symbol = where.unit.symbol.equals;
        if (symbol === 'DOS') return { baseQuantity: 5000, unit: { symbol: 'DOS' } };
        if (symbol === 'BOTTLE') return { baseQuantity: 500, unit: { symbol: 'BOTTLE' } };
        return null;
      },
    },
  };

  const dos = await convertToBaseUnit('milk', 10, 'DOS', BaseUnit.ML, fakeTx as any);
  const bottle = await convertToBaseUnit('milk', 10, 'BOTTLE', BaseUnit.ML, fakeTx as any);

  assert.equal(dos.toString(), '50000');
  assert.equal(bottle.toString(), '5000');
});

test('converts KG to grams and rejects incompatible mappings', async () => {
  const fakeTx = {
    product: { findUnique: async () => ({ id: 'sugar' }) },
    productUnitConversion: { findFirst: async () => null },
  };

  const grams = await convertToBaseUnit('sugar', 10, 'KG', BaseUnit.G, fakeTx as any);
  assert.equal(grams.toString(), '10000');

  await assert.rejects(
    () => convertToBaseUnit('sugar', 1, 'KG', BaseUnit.ML, fakeTx as any),
    /tidak kompatibel/i
  );
  await assert.rejects(
    () => convertToBaseUnit('sugar', 1, 'ML', BaseUnit.PCS, fakeTx as any),
    /tidak kompatibel/i
  );
});

test('handles decimal conversions with Decimal precision', async () => {
  const fakeTx = {
    product: { findUnique: async () => ({ id: 'decimal' }) },
    productUnitConversion: {
      findFirst: async ({ where }: any) => {
        if (where.unit.symbol.equals === 'DOS') return { baseQuantity: 5000, unit: { symbol: 'DOS' } };
        return null;
      },
    },
  };

  const half = await convertToBaseUnit('decimal', 0.5, 'DOS', BaseUnit.ML, fakeTx as any);
  const quarter = await convertToBaseUnit('decimal', 0.25, 'DOS', BaseUnit.ML, fakeTx as any);
  const fraction = await convertToBaseUnit('decimal', 1.125, 'DOS', BaseUnit.ML, fakeTx as any);

  assert.equal(half.toString(), '2500');
  assert.equal(quarter.toString(), '1250');
  assert.equal(fraction.toString(), '5625');
});
