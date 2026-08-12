# Implementation Plan — Apply Packaging Conversion Migration & Seed Data

## 1. Prisma Version Resolution

### Current State (Actual Repo)
- `backend/src/utils/prisma.ts` currently contains:
  ```ts
  import { PrismaClient } from "@prisma/client";
  export const prisma = new PrismaClient();
  ```
- There is **no** `@prisma/adapter-pg` usage and **no** `../generated/prisma/client` import in the current codebase.
- `backend/package.json` specifies:
  - `@prisma/client`: `^5.12.1`
  - `prisma` (devDependency): `^5.12.1`
- `node_modules` are not installed in this worktree, so `npx prisma --version` earlier returned the **globally installed** Prisma 7.5.0, not the project's intended version.

### Contradiction to Resolve
You mentioned using `@prisma/adapter-pg` with a generated client path, but the actual repository does not contain that setup. Before proceeding, confirm whether:
1. The current `prisma.ts` is the intended final state, **or**
2. You want the migration plan to assume an adapter-based `PrismaClient` setup that hasn't been committed yet.

### Recommended Answer
Treat the current `prisma.ts` as the source of truth for now. The project is intended to run on Prisma **5.12.1** per `package.json`. The global Prisma 7.5.0 CLI should **not** be used for migrations in this repo.

### Action
1. Install dependencies: `npm install` in `backend/`
2. Verify local CLI: `npx prisma --version` should show `5.12.1`
3. If it still shows 7.5.0, explicitly run `npx prisma@5.12.1 migrate dev ...` to bypass the global CLI

---

## 2. Pre-Migration Verification

Run these checks **before** creating the migration:

```bash
# Verify database connectivity
npx prisma db execute --stdin <<< "SELECT 1"

# Or via a quick TypeScript script
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  await prisma.\$connect();
  console.log('DB OK');
  await prisma.\$disconnect();
})();
"
```

Verify existing data counts (read-only):
- `SELECT COUNT(*) FROM Product;`
- `SELECT COUNT(*) FROM Unit;`
- `SELECT COUNT(*) FROM WarehouseStock;`
- `SELECT COUNT(*) FROM StockLedger;`

Confirm no existing `ProductUnitConversion` table exists.

---

## 3. Create Migration

Create the minimal additive migration:

```bash
npx prisma migrate dev --name add-product-unit-conversion
```

Expected migration SQL (PostgreSQL):
- `CREATE TABLE "ProductUnitConversion" (...)`
- `ALTER TABLE "ProductUnitConversion" ADD CONSTRAINT "ProductUnitConversion_productId_fkey" ...`
- `ALTER TABLE "ProductUnitConversion" ADD CONSTRAINT "ProductUnitConversion_unitId_fkey" ...`
- `CREATE UNIQUE INDEX "ProductUnitConversion_productId_unitId_key" ...`
- `CREATE INDEX "ProductUnitConversion_productId_idx" ...`
- `CREATE INDEX "ProductUnitConversion_unitId_idx" ...`
- `CREATE INDEX "ProductUnitConversion_isDefault_idx" ...`

**Do not** modify any existing table besides adding the new table and foreign keys.

---

## 4. Seed Data Strategy

### Discovery Query
Before seeding, inspect actual products and units:

```sql
SELECT p.id, p.name, p.baseUnit, u.symbol, u.name
FROM Product p
LEFT JOIN Unit u ON p.unitId = u.id
WHERE p.deletedAt IS NULL AND p.isActive = TRUE;
```

### Idempotent Seed Logic
Use `upsert` in the Prisma seed script (`prisma/seed.ts` or existing seeder):

```ts
await prisma.productUnitConversion.upsert({
  where: { productId_unitId: { productId, unitId } },
  update: { baseQuantity, isDefault },
  create: { productId, unitId, baseQuantity, isDefault },
});
```

### Known Safe Mappings (seed ONLY these)
Only seed when both the product and unit already exist and the quantity is confirmed:

| Product Name Pattern | Base Unit | Unit Symbol | baseQuantity | isDefault |
|----------------------|-----------|-------------|--------------|-----------|
| Fresh Milk 500ml     | ML        | BOTTLE      | 500          | true      |
| Fresh Milk 500ml     | ML        | DOS         | 5000         | false     |
| Sugar                | G         | KG          | 1000         | true      |

### Intentionally Skipped
- Products with unknown packaging quantities
- Units that do not already exist in the `Unit` table
- Any mapping that would require guessing

---

## 5. Post-Migration Verification

After applying the migration:

```bash
npx prisma validate
npx prisma generate
```

Verify table exists:
```sql
SELECT * FROM "ProductUnitConversion" LIMIT 5;
```

Verify seeded data:
```sql
SELECT p.name, u.symbol, puc.baseQuantity, puc.isDefault
FROM "ProductUnitConversion" puc
JOIN Product p ON puc.productId = p.id
JOIN Unit u ON puc.unitId = u.id;
```

---

## 6. Smoke Tests (Database-Backed)

Run these via a temporary test script or direct API calls:

### Test 1: Receive 10 DOS Fresh Milk
1. Ensure Fresh Milk exists with baseUnit=ML and conversions BOTTLE=500, DOS=5000
2. `POST /inventory/receive` with `{ productId, warehouseId, quantity: 10, unit: "DOS" }`
3. Query `WarehouseStock` — quantity should increase by `50000`
4. Query `StockLedger` — latest entry `quantity` should be `50000`, `movementType` = `RECEIVE`
5. Assert ledger does NOT contain `10` as a canonical quantity

### Test 2: Receive 10 BOTTLE
1. `POST /inventory/receive` with `{ productId, warehouseId, quantity: 10, unit: "BOTTLE" }`
2. Ledger quantity should be `5000`

### Test 3: KG Conversion (if seeded)
1. `POST /inventory/receive` for Sugar with `{ quantity: 10, unit: "KG" }`
2. Ledger quantity should be `10000`

### Test 4: Recipe 50 ML
1. Create recipe for Coffee with Fresh Milk = 50 ML
2. Query `RecipeItem` — `quantity` should be `50`, `unitId` should point to ML unit
3. Available stock = `50000 / 50` = `1000`

### Test 5: Missing Conversion
1. Product with baseUnit=ML but no DOS conversion
2. UI should only show ML
3. Backend should reject `unit: "DOS"` with clear error

---

## 7. Final Build Verification

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npx tsc --noEmit

# Mobile
cd mobile
npx tsc --noEmit
```

Treat only new errors as failures. Pre-existing type declaration errors are out of scope.

---

## 8. Rollback Plan

If migration fails:
1. `npx prisma migrate resolve --rolled-back <migration_name>`
2. Do not manually alter database tables outside Prisma's migration system

If seed causes issues:
1. Delete seeded `ProductUnitConversion` records manually
2. Re-run seed after fixing product/unit discovery

---

## 9. Acceptance Criteria

- [ ] `ProductUnitConversion` table exists with correct schema, indexes, and constraints
- [ ] Existing inventory quantities are unchanged
- [ ] Seed data is idempotent and contains only confirmed mappings
- [ ] Receive 10 DOS → 50,000 ML in ledger
- [ ] Receive 10 BOTTLE → 5,000 ML in ledger
- [ ] Recipe stores 50 ML with correct unitId
- [ ] Available stock calculates 1,000 portions
- [ ] Backend, frontend, and mobile type checks pass with no new errors
