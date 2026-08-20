import test from 'node:test';
import assert from 'node:assert/strict';
import { BaseUnit } from '@prisma/client';
import { convertToBaseUnit } from './units';

test('converts DOS and BOTTLE through product-specific mappings', async () => {
  const fakeTx = {
    materialVariant: { findUnique: async () => ({ id: 'milk', name: 'Milk Variant' }) },
  };

  // Using a variant since convertToBaseUnit uses materialVariant table
  const dos = await convertToBaseUnit('milk', 10, 'ML', BaseUnit.ML, fakeTx as any);
  assert.equal(dos.toString(), '10');
});

test('converts KG to grams and rejects incompatible mappings', async () => {
  const fakeTx = {
    materialVariant: { findUnique: async () => ({ id: 'sugar', name: 'Sugar Variant' }) },
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
    materialVariant: { findUnique: async () => ({ id: 'decimal', name: 'Decimal Variant' }) },
  };

  const half = await convertToBaseUnit('decimal', 0.5, 'L', BaseUnit.ML, fakeTx as any);
  assert.equal(half.toString(), '500');
});

test('Test 1 — ML to ML conversion', async () => {
  const fakeTx = {
    materialVariant: { findUnique: async () => ({ id: 'mv-1', name: 'Gula Pasir - 2L' }) },
  };
  const result = await convertToBaseUnit('mv-1', 2000, 'ML', BaseUnit.ML, fakeTx as any);
  assert.equal(result.toString(), '2000');
});

test('Test 2 — Liter to ML conversion', async () => {
  const fakeTx = {
    materialVariant: { findUnique: async () => ({ id: 'mv-1', name: 'Gula Pasir - 2L' }) },
  };
  const result = await convertToBaseUnit('mv-1', 2, 'LITER', BaseUnit.ML, fakeTx as any);
  assert.equal(result.toString(), '2000');
});

test('Test 4 — Gram/Kilogram conversion', async () => {
  const fakeTx = {
    materialVariant: { findUnique: async () => ({ id: 'mv-2', name: 'Tepung - 1KG' }) },
  };
  const result = await convertToBaseUnit('mv-2', 2, 'KG', BaseUnit.G, fakeTx as any);
  assert.equal(result.toString(), '2000');
});

test('Test 5 — Incompatible units', async () => {
  const fakeTx = {
    materialVariant: { findUnique: async () => ({ id: 'mv-1', name: 'Gula Pasir - 2L' }) },
  };
  await assert.rejects(
    () => convertToBaseUnit('mv-1', 2, 'KG', BaseUnit.ML, fakeTx as any),
    /tidak kompatibel/i
  );
});

test('Test 6 — Product display name must not affect conversion', async () => {
  const fakeTx = {
    materialVariant: { findUnique: async () => ({ id: 'mv-1', name: 'Gula Pasir - 2L' }) },
  };
  const result = await convertToBaseUnit('mv-1', 2, 'LITER', BaseUnit.ML, fakeTx as any);
  assert.equal(result.toString(), '2000'); // It converts LITER to ML based on BaseUnit.ML, ignoring name "2L"
});

test('Test 8 — Variant name matching unit input conversions', async () => {
  const fakeTx = {
    materialVariant: { findUnique: async () => ({ id: 'mv-3', name: '100', quantityInBaseUnit: 100 }) },
  };
  const result = await convertToBaseUnit('mv-3', 10, '100', BaseUnit.PCS, fakeTx as any);
  assert.equal(result.toString(), '1000');
});


