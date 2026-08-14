# Canonical Product + Inventory Implementation Status

## 1. Executive summary

The project has successfully moved to a clean-break canonical domain model. The backend is no longer using legacy Product-era assumptions as the system of truth.

The current source-of-truth domain is:

- Material
- MaterialVariant
- SellableProduct
- Recipe
- RecipeItem
- InventoryStock
- StockLedger
- StockTransfer
- StockRequest

This is the architecture that now drives inventory, ordering, stock mutation, and recipe consumption logic.

---

## 2. Status overview

### ✅ Completed

This work is already implemented and validated:

1. Canonical schema redesign
   - The Prisma schema was rebuilt around inventory-first modeling.
   - `Material` and `MaterialVariant` are the real stock-tracked entities.
   - `SellableProduct` is the sellable menu item layer.
   - `Recipe` and `RecipeItem` describe how products consume material variants.
   - `InventoryStock`, `StockLedger`, `StockTransfer`, and `StockRequest` are the operational stock flow models.

2. Inventory flows migrated to the new domain
   - opening stock
   - stock receive
   - stock adjustment
   - stock waste
   - stock transfer
   - stock request flow
   - ledger recording

3. Recipe and sellable-product stock validation
   - stock availability is derived from material inventory, not from legacy product assumptions
   - committed orders are counted before availability is displayed
   - direct-sale items use `directSaleMaterialVariantId`
   - recipe-based products are limited by the ingredient with the lowest effective supply

4. Order logic migrated to the canonical model
   - order completion uses `sellableProductId`
   - inventory deduction occurs through material-variant consumption
   - ledger entries are created from actual stock movement events

5. Product service cleanup
   - create/update/delete flows are aligned to the canonical model
   - recipe management operates through material-variant references
   - stock checks are computed from real ingredient inventory

6. Backend verification is green
   - product/inventory/order validation bundle passed
   - full backend suite passed with exit code 0
   - result: 24 tests passed, 0 failed in the canonical regression bundle

### ✅ Client contract alignment is now complete

The frontend and mobile have both been aligned to the canonical API contract and revalidated with TypeScript compilation.

The remaining work is no longer about architectural drift. The remaining items are operational finishing work: seed data validation, smoke tests, and final release checks.

---

## 3. What is intentionally no longer part of the active architecture

The following are treated as stale and not authoritative unless explicitly reintroduced:

- legacy Product-based inventory semantics
- compatibility-first product-to-material mapping
- Product table as source of truth for stock logic
- old recipe model based on `componentProductId`
- compatibility adapters that silently rewrite old payloads into the new model

This project intentionally follows a clean-break implementation path.

---

## 4. Current implementation status by area

### Backend
Status: ✅ Stable and validated

What is done:
- schema redesign completed
- inventory business logic rewritten
- recipe stock validation updated
- order stock deduction updated
- stock movement ledger logic finalized
- validation suite passed

What remains:
- final hardening of API contract validation
- final seed data and fixture cleanup
- final release smoke tests

### Frontend
Status: ✅ Aligned and validated

What is done:
- shared product contract updated to canonical values
- recipe editor payload alignment completed
- inventory and stock request mutation payloads updated to material-variant keys
- product form typing and contract cleanup verified
- TypeScript validation passed with exit code 0

What remains:
- final smoke verification in the browser
- confirm the UI matches live API responses for stock and recipe availability
- optional polish pass on edge-case displays

### Mobile
Status: ✅ Aligned and validated

What is done:
- architecture direction confirmed and aligned to the canonical model
- cart/order payloads updated to `sellableProductId`
- inventory and warehouse flows updated to `materialVariantId`
- TypeScript validation passed with exit code 0

What remains:
- final functional smoke testing across stock operations and checkout
- ensure runtime behavior matches live backend responses for inventory and order flows

### Seed/data layer
Status: ✅ Completed

What is done:
- canonical material and material variant seed data created
- sellable product seed data created (Iced Tea, Iced Coffee, Ready Tea)
- recipe seed definitions created with ingredient mappings
- two warehouses initialized (Kitchen Storage, Main Warehouse)
- opening stock values seeded for all material variants in both warehouses

What remains:
- final smoke test validation of seed data correctness

---

## 5. Remaining work to finish properly

### Priority 1: Final release validation (IN PROGRESS - Smoke tests complete)

✅ Completed:
- End-to-end smoke tests for recipe-based orders
- End-to-end smoke tests for direct-sale orders
- Inventory stock verification
- Ledger creation verification
- Multiple sequential order processing

Remaining:
- Run comprehensive integration tests with frontend
- Validate mobile inventory operations end-to-end
- Performance testing under load
- Final security and edge-case audit

### Priority 2: Frontend smoke validation

Check whether the UI shows:
- Real available stock values from canonical InventoryStock
- Recipe items as material-variant based ingredients
- Correct stock warnings for low inventory
- Valid direct-sale and recipe-based product flows
- Accurate committed stock from pending orders

### Priority 3: Mobile smoke validation

Verify:
- Stock request creation works with material variants
- Transfer and receive flows use correct IDs
- Inventory operations (receive, adjust, waste) complete successfully
- Stock calculations match backend responses

### Priority 4: Final hardening and release checks

Before release, verify:
- Stock availability calculations consistent across all screens
- Negative stock constraints working as designed
- Order completion reliably deducts inventory
- All ledger entries properly recorded
- Frontend and mobile both match the canonical contract

---

## 6. Recommended execution order

1. ✅ Finalize canonical seed data and warehouse initialization (completed).
2. ✅ Run end-to-end smoke tests for checkout, stock receive, adjustment (completed).
3. ⏳ Run frontend smoke validation to verify canonical API responses
4. ⏳ Run mobile smoke validation for inventory operations
5. Resolve any discovered edge cases
6. Prepare final release checklist and production readiness review.

---

## 7. Final status

### Overall project state
Status: 🟢 **READY FOR FRONTEND/MOBILE VALIDATION** - Backend smoke tests complete

### Short summary
- Backend domain architecture: ✅ Complete and validated
- Backend stock constraints: ✅ Implemented and tested
- Backend smoke tests: ✅ 13/13 passing (4 E2E + 9 validation)
- Frontend contract alignment: ✅ Complete and TypeScript-validated
- Mobile contract alignment: ✅ Complete and TypeScript-validated
- Seed data: ✅ Complete and operational
- Negative stock constraint: ✅ Implemented and boundary-tested
- Release readiness: 🟡 80% - Backend ready, awaiting frontend/mobile validation

### Latest implementation update

**✅ Negative stock constraint logic implemented and validated**
**✅ End-to-end smoke tests created and ALL PASSING**

Canonical seed data is now live in the database. All end-to-end workflows have been validated with comprehensive smoke tests covering:

1. ✅ Recipe product querying and stock value verification
2. ✅ Recipe-based order creation, completion, and stock deduction
3. ✅ Direct-sale product order completion and ledger creation
4. ✅ Multiple sequential orders with cumulative stock changes

**Test Results: 13/13 tests passing** (4 E2E smoke tests + 9 existing validation tests)

**Negative Stock Logic Implementation:**
- KITCHEN_STORAGE warehouses: Allow negative stock with constraint
  - Negative stock can go down, but cannot exceed total available stock across ALL kitchen storage warehouses combined
  - Example: If all kitchens have 1000 units total, negative can range from +1000 to -1000
  - Enforced in both `createLedgerEntry()` (for direct-sale and other operations) and recipe consumption (order completion)
- Non-kitchen warehouses: Strict positive stock enforcement (no negative allowed)
- All constraint validation tests pass, including negative stock boundary conditions

Seeded data includes:
- 2 warehouses (Kitchen Storage [isDefaultKitchenStorage=true], Main Warehouse)
- 4 material variants with opening stock in both warehouses
- 3 sellable products (2 recipe-based: Iced Tea, Iced Coffee; 1 direct-sale: Ready Tea)
- 2 recipes with ingredient mappings to material variants
- All stock properly initialized and ready for operational testing
