# Product Domain Redesign — Implementation Plan

## Status

This document is a plan-only review of the repository and the approved target architecture. It does not implement any code, schema, migration, database change, API change, frontend change, mobile change, or test change.

---

## 1. Current Implementation Inventory

This plan is grounded in the current repository state.

### Prisma model inventory

The core product domain is currently centered on [backend/prisma/schema.prisma](backend/prisma/schema.prisma):

- `Product`
- `ProductUnitConversion`
- `Recipe`
- `RecipeItem`
- `WarehouseStock`
- `StockLedger`
- `StockTransfer`
- `StockTransferItem`
- `StockRequest`
- `StockRequestItem`
- `Order`
- `OrderItem`
- `Category`
- `Unit`
- `Payment`
- `Warehouse`
- `User`

### Product model responsibilities in current code

The current `Product` model in [backend/prisma/schema.prisma](backend/prisma/schema.prisma) currently owns:

- category relation
- sku and name
- price and cost
- inventoryType (`FINISHED_GOOD`, `RAW_MATERIAL`, `PACKAGING`)
- trackInventory and minimumStock
- unitId and baseUnit
- warehouse stock relation
- stock ledger relation
- stock transfer item relation
- stock request item relation
- recipe relation
- recipe items as component relation
- product unit conversion table

This is the exact source of the design overload.

### Current implementation hotspots

These are the files that materially encode the current product behavior:

- [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- [backend/src/modules/products/service.ts](backend/src/modules/products/service.ts)
- [backend/src/modules/inventory/service.ts](backend/src/modules/inventory/service.ts)
- [backend/src/modules/inventory/stock.service.ts](backend/src/modules/inventory/stock.service.ts)
- [backend/src/modules/orders/service.ts](backend/src/modules/orders/service.ts)
- [backend/src/utils/units.ts](backend/src/utils/units.ts)
- [backend/src/modules/reports/service.ts](backend/src/modules/reports/service.ts)
- [backend/src/modules/products/controller.ts](backend/src/modules/products/controller.ts)
- [backend/src/modules/products/router.ts](backend/src/modules/products/router.ts)
- [backend/src/modules/products/validation.ts](backend/src/modules/products/validation.ts)
- [frontend/src/app/(authenticated)/products/page.tsx](frontend/src/app/(authenticated)/products/page.tsx)
- [mobile/src/screens/NewOrderScreen.tsx](mobile/src/screens/NewOrderScreen.tsx)

### Current Product behavior in code

#### Product service behavior

[backend/src/modules/products/service.ts](backend/src/modules/products/service.ts) demonstrates the product-centric world:

- sells only `FINISHED_GOOD` products
- calculates `availableStock` from warehouse stocks and committed stock
- treats recipes as product-owned logic
- resolves recipe component stock through `componentProductId`
- validates product type and price by inventory type
- stores unit conversions in `ProductUnitConversion`

#### Inventory behavior

[backend/src/modules/inventory/service.ts](backend/src/modules/inventory/service.ts) shows inventory logic keyed to `Product`:

- filtering product lists by `inventoryType`
- computing total stock through `warehouseStock.productId`
- pricing with product price/cost
- recipe-based finished-good availability checks

#### Order/POS behavior

[backend/src/modules/orders/service.ts](backend/src/modules/orders/service.ts) currently:

- fetches products by product IDs
- rejects non-`FINISHED_GOOD` products at POS checkout
- calculates required recipe ingredient quantities
- checks ingredient stock against warehouse balance
- records order items with `productId`
- uses product price, category, and name as live ordering data

#### Unit conversion behavior

[backend/src/utils/units.ts](backend/src/utils/units.ts) currently does this:

- validates unit compatibility based on product `baseUnit`
- finds `ProductUnitConversion` by `productId + unit symbol`
- converts input quantity to base quantity using a product-scoped conversion table
- this is exactly the wrong boundary for historical packaging conversion safety

#### Frontend assumptions

[frontend/src/app/(authenticated)/products/page.tsx](frontend/src/app/(authenticated)/products/page.tsx) assumes a single product form with:

- price/cost
- inventory type
- trackInventory
- unitId
- baseUnit
- recipe items tied to a product form
- conversions attached to product details

#### Mobile assumptions

[mobile/src/screens/NewOrderScreen.tsx](mobile/src/screens/NewOrderScreen.tsx) assumes a sellable product list with:

- `product.price`
- `product.trackInventory`
- `product.availableStock`
- `product.categoryId`
- direct sale item semantics

This confirms that mobile is downstream of a sellable product object, while inventory logic is still product-centric in the backend.

---

## 2. Product Dependency Map

The current `Product` dependency graph is real and must be preserved during migration planning.

### Actual dependency graph from repository

```text
Product
├── Category
├── Unit
├── WarehouseStock
│   └── Warehouse
├── StockLedger
│   └── Warehouse
├── StockTransferItem
│   └── StockTransfer
├── StockRequestItem
│   └── StockRequest
├── Recipe
│   └── RecipeItem
│       └── Product (componentProductId)
├── ProductUnitConversion
│   └── Unit
├── OrderItem
│   └── Order
├── PromotionItem
│   └── Promotion
├── Payment (indirectly via Order, not Product)
└── product-level price / cost / inventory semantics
```

### Dependency-by-dependency review

| Current model/file | Current Product relationship | Target entity | Migration difficulty | Can temporarily remain legacy? |
|---|---|---|---|---|
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) `Product.category` | `Product.categoryId -> Category.id` | category remains relevant to Material and SellableProduct | Low | Yes |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) `Product.unit` | `Product.unitId -> Unit.id` | MaterialVariant or UnitDefinition | Medium | Yes |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) `Product.baseUnit` | product-scoped canonical unit | MaterialVariant or UnitDefinition | High | Yes, temporarily |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) `WarehouseStock.productId` | product stock balance | InventoryStock -> MaterialVariant | High | Yes, temporary compatibility |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) `StockLedger.productId` | historical stock movement | StockLedger -> MaterialVariant | Critical | Yes, temporary compatibility |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) `Recipe.productId` | recipe owned by product | SellableProduct -> Recipe | High | Yes, temporary compatibility |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) `RecipeItem.componentProductId` | recipe ingredient product | RecipeItem -> MaterialVariant | Critical | Yes, temporary compatibility |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) `StockTransferItem.productId` | product transfer item | Inventory transfer item -> MaterialVariant | High | Yes |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) `StockRequestItem.productId` | request item by product | Inventory request item -> MaterialVariant | High | Yes |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) `OrderItem.productId` | sales snapshot by product | OrderItem -> SellableProduct snapshot | High | Yes, temporary compatibility |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) `ProductUnitConversion.productId` | per-product conversion map | PackagingConfiguration / PackagingVersion | Critical | Yes, temporary compatibility |
| [backend/src/modules/products/service.ts](backend/src/modules/products/service.ts) `getAllProducts` | calculates available stock and recipe mapping | new inventory and sellable domain service split | High | Yes |
| [backend/src/modules/inventory/service.ts](backend/src/modules/inventory/service.ts) summary and stock list | product-centric inventory scoring | InventoryStock aggregator by MaterialVariant | High | Yes |
| [backend/src/modules/orders/service.ts](backend/src/modules/orders/service.ts) stock validation | checks product recipe and inventory availability | recipe-driven ingredient validation | Critical | Yes |
| [backend/src/utils/units.ts](backend/src/utils/units.ts) conversion logic | ProductUnitConversion-based conversion | PackagingVersion conversion logic | Critical | Yes |
| [frontend/src/app/(authenticated)/products/page.tsx](frontend/src/app/(authenticated)/products/page.tsx) product form | product contains all product attributes | Material + SellableProduct forms | High | Yes, compatibility layer |
| [mobile/src/screens/NewOrderScreen.tsx](mobile/src/screens/NewOrderScreen.tsx) product list | POS product object is generic sellable item | SellableProduct view model | Medium | Yes, compatibility DTO |

### Most sensitive current relationships

The highest-risk relationships are:

1. `WarehouseStock.productId` -> `InventoryStock`
2. `StockLedger.productId` -> `StockLedger.materialVariantId`
3. `RecipeItem.componentProductId` -> `RecipeItem.materialVariantId`
4. `ProductUnitConversion.productId` -> packaging conversion
5. `OrderItem.productId` -> sellable product snapshot

These are the relationships that must remain historically fixed and safe during migration.

---

## 3. Target Schema Plan (Proposed, Not Implemented)

This is a proposed schema design, not a database change.

### Proposed entities

#### Brand

Purpose:
- commercial material identity

Key fields:
- id
- name
- isActive
- createdAt
- updatedAt

Relationships:
- `Material` has many `Brand`
- `Brand` may be referenced by multiple materials

Indexes:
- `name` unique or normalized unique if business requires

Historical requirements:
- brand identities are low-risk and should be immutable once used in material definitions unless explicitly renamed

#### Material

Purpose:
- conceptual physical inventory root

Key fields:
- id
- brandId
- name
- categoryId
- description
- isActive
- createdAt
- updatedAt

Relationships:
- `Material` has many `MaterialVariant`
- `Material` belongs to `Brand`

Indexes:
- `(brandId, name)`
- `isActive`

Historical requirements:
- material identity should persist; rename only if needed, but never rewrite transactions

#### MaterialVariant

Purpose:
- actual physical inventory specification

Key fields:
- id
- materialId
- name
- variantCode
- contentQuantity
- contentUnit
- baseUnit
- sku
- barcode
- isActive
- createdAt
- updatedAt

Relationships:
- `MaterialVariant` belongs to `Material`
- `MaterialVariant` has many `InventoryStock`
- `MaterialVariant` has many `RecipeItem`
- `MaterialVariant` has many `PackagingConfiguration`
- `MaterialVariant` may be linked to `SupplierOffer`

Indexes:
- `(materialId, name)`
- `sku` unique if business requires unique variant SKUs
- `variantCode` unique if used

Historical requirements:
- variant identity is the operational inventory identity

#### PackagingType

Purpose:
- reusable packaging label, not conversion semantics by itself

Key fields:
- id
- code
- name
- description
- isActive

Relationships:
- many `PackagingConfiguration` rows may use a packaging type

Use only if the business truly distinguishes type from configuration.

#### PackagingConfiguration

Purpose:
- supplier- or procurement-specific packaging definition

Key fields:
- id
- materialVariantId
- packagingTypeId
- supplierOfferId (optional)
- name
- unitLabel
- isActive
- createdAt
- updatedAt

Relationships:
- belongs to `MaterialVariant`
- belongs to `SupplierOffer` optionally
- has many `PackagingVersion`

Indexes:
- `(materialVariantId, supplierOfferId, isActive)`
- `name`

Historical requirements:
- configuration should not be edited after first use in a transaction

#### PackagingVersion

Purpose:
- historical conversion definition

Key fields:
- id
- packagingConfigurationId
- versionNumber
- effectiveFrom
- effectiveTo
- isActive
- conversionFactor
- baseUnit
- normalizedToBaseQuantity
- createdAt
- createdBy

Relationships:
- belongs to `PackagingConfiguration`
- referenced by historical receiving and stock movement records

Indexes:
- `(packagingConfigurationId, effectiveFrom)`
- `isActive`
- `versionNumber`

Historical requirements:
- immutable after use in a transaction
- historical transactions must always reference the version used

#### Supplier

Purpose:
- commercial vendor identity

Key fields:
- id
- name
- code
- isActive
- createdAt
- updatedAt

Relationships:
- has many `SupplierOffer`

Indexes:
- `code` unique if used

#### SupplierOffer

Purpose:
- supplier-specific purchasing relationship for a material variant

Key fields:
- id
- supplierId
- materialVariantId
- packagingConfigurationId
- unitPrice
- currency
- supplierSku
- effectiveFrom
- effectiveTo
- isActive
- createdAt
- updatedAt

Relationships:
- belongs to `Supplier`
- belongs to `MaterialVariant`
- may use `PackagingConfiguration`

Indexes:
- `(supplierId, materialVariantId)`
- `supplierSku`

Historical requirements:
- historical receipt cost should use the supplier offer in effect at purchase time

#### SellableProduct

Purpose:
- commercial identity sold through POS

Key fields:
- id
- name
- sku
- categoryId
- brandId (optional)
- productType (`DIRECT_SALE`, `RECIPE_BASED`)
- price
- isActive
- createdAt
- updatedAt

Relationships:
- has one `Recipe` for recipe-based products
- may optionally link to a `MaterialVariant` for direct-sale stock mapping
- has many `OrderItem` snapshots

Indexes:
- `sku` unique if used
- `categoryId`
- `productType`

Historical requirements:
- sellable product identity must be separate from material identity

#### Recipe

Purpose:
- composition of a sellable product

Key fields:
- id
- sellableProductId
- versionNumber
- effectiveFrom
- effectiveTo
- isActive
- createdAt
- updatedAt

Relationships:
- belongs to `SellableProduct`
- has many `RecipeItem`

Indexes:
- `(sellableProductId, versionNumber)`
- `isActive`

Historical requirements:
- immutable after use in order or production calculations

#### RecipeItem

Purpose:
- one ingredient quantity in a recipe

Key fields:
- id
- recipeId
- materialVariantId
- quantity
- baseUnit
- description
- createdAt
- updatedAt

Relationships:
- belongs to `Recipe`
- belongs to `MaterialVariant`

Indexes:
- `(recipeId, materialVariantId)`
- `baseUnit`

Historical requirements:
- recipe item values must be stored in canonical base units
- historical recipe calculations must not be rewritten by future recipe edits

#### InventoryStock

Purpose:
- current warehouse balance for a material variant

Key fields:
- id
- warehouseId
- materialVariantId
- quantity
- quantityUnit
- updatedAt

Relationships:
- belongs to `Warehouse`
- belongs to `MaterialVariant`
- has many `StockLedger`

Indexes:
- `(warehouseId, materialVariantId)` unique
- `(warehouseId, quantity)` for stock queries if needed

Historical requirements:
- operational current state only
- not the historical source of truth

#### StockLedger

Purpose:
- immutable stock movement history

Key fields:
- id
- warehouseId
- materialVariantId
- movementType
- quantity
- baseQuantity
- baseUnit
- referenceType
- referenceId
- packagingConfigurationId
- packagingVersionId
- conversionSnapshotJson
- createdById
- createdAt

Relationships:
- belongs to `Warehouse`
- belongs to `MaterialVariant`
- may reference `PackagingVersion`

Indexes:
- `(warehouseId, materialVariantId, createdAt)`
- `(referenceType, referenceId)`
- `(movementType, createdAt)`

Historical requirements:
- write-once history; immutable after creation

#### LegacyProductMapping

Purpose:
- temporary compatibility layer for historical `Product.id` references

Key fields:
- id
- legacyProductId
- targetType
- targetId
- sourceTable
- createdAt
- effectiveFrom

Relationships:
- no strong domain requirement beyond compatibility bridging

Indexes:
- `legacyProductId`
- `(targetType, targetId)`

Historical requirements:
- read-only compatibility or controlled mapping layer

### Schema design notes

This target schema is intentionally smaller than a full generic product tree. It separates:

- physical identity (Material + MaterialVariant)
- sales identity (SellableProduct)
- conversion history (PackagingConfiguration + PackagingVersion)
- current stock state (InventoryStock)
- historical movement history (StockLedger)
- pricing context (SupplierOffer)
- legacy compatibility (LegacyProductMapping)

---

## 4. Challenge the Target Schema

This is the critical review before implementation begins.

### Material vs MaterialVariant

The repository does not currently distinguish materials from variants consistently, but the business requirement clearly supports that distinction.

#### Cases

##### Case A: UHT Milk
- 600 ML
- 1000 ML

Recommendation:
- one `Material` for Brand A UHT Milk
- two `MaterialVariant` rows

##### Case B: Sugar
- only one variant
- base unit KG

Recommendation:
- one `Material`
- one default `MaterialVariant`

##### Case C: Coffee Beans
- 1 KG
- 500 G

Recommendation:
- one `Material`
- multiple `MaterialVariant` rows

##### Case D: Cup
- 12 OZ
- 16 OZ

Recommendation:
- one `Material` if same cup can have different sizes
- separate variants

Conclusion:
- every material should have at least one default variant in the implementation model
- `MaterialVariant` should always be the inventory identity in the target design

### Base unit ownership

The distinction between `contentQuantity + contentUnit` and `baseUnit` is real and important.

Example:
- 600 ML
  - `contentQuantity = 600`
  - `contentUnit = ML`
  - `baseUnit = ML`

Recommendation:
- keep both fields if the business will ever represent packaging and conversion semantics explicitly
- if the business is simpler, `contentQuantity` and `contentUnit` can be stored on the variant row and `baseUnit` duplicated for canonical normalization
- use `baseUnit` as the canonical inventory and recipe unit

### Packaging distinction

The plan should not create `PackagingType`, `PackagingConfiguration`, and `PackagingVersion` unless the domain requires all three.

Recommended final rule:
- `PackagingType` only if the business distinguishes a reusable label from the actual configuration
- `PackagingConfiguration` is generally required
- `PackagingVersion` is required for historical safety

### Supplier packaging

The supplier-specific scenario is a real requirement.

Case:
- Supplier A carton = 12 bottles
- Supplier B carton = 24 bottles

Recommendation:
- `PackagingConfiguration` should be supplier-aware at procurement level
- `SupplierOffer` should own or reference the effective packaging configuration at purchase time
- `MaterialVariant` should remain the operating stock identity

### Inventory abstraction

`Warehouse + MaterialVariant` is sufficient for the first implementation phase.

Do not add `InventoryItem` unless the business later needs a generic stock abstraction beyond `MaterialVariant + Warehouse`.

The repository does not currently justify a separate inventory abstraction layer.

---

## 5. Migration Strategy

### Migration principle

The repository already has a single product-centric source of truth. The migration must preserve current business continuity while moving to the target domain.

### Mapping strategy by current `Product.inventoryType`

#### RAW_MATERIAL

Current repository model:
- product is inventory-tracked material
- recipe items can use this as components

Likely target mapping:
- `Material`
- `MaterialVariant`
- `InventoryStock`
- `StockLedger`

#### PACKAGING

Current repository model:
- product is a packaging-like item
- treated as a raw material or packaging stock category

Likely target mapping:
- treat as a material-like inventory item if it actually exists as stock
- otherwise classify as packaging configuration or a dedicated packaging material if required by the business

This is a business question. The implementation should not over-interpret packaging as inventory identity.

#### FINISHED_GOOD without recipe

Current repository model:
- direct sale stock item

Likely target mapping:
- `SellableProduct` with `DIRECT_SALE`
- direct link to `MaterialVariant` if physically stocked

#### FINISHED_GOOD with recipe

Current repository model:
- product is a recipe-based finished good

Likely target mapping:
- `SellableProduct` with `RECIPE_BASED`
- `Recipe`
- `RecipeItem` -> `MaterialVariant`

### The migration must not assume a one-to-one conversion

A legacy `Product` row may need to map to multiple new records, in particular:

- one `Material`
- one `MaterialVariant`
- one `SellableProduct`
- one `Recipe`
- one mapping record in `LegacyProductMapping`

This is why a compatibility layer is necessary.

---

## 6. Legacy Product ID Strategy

This is a critical migration issue.

### Options

#### Option A: keep Product as a legacy table

Pros:
- minimal disruption to existing code paths
- easier rollback

Cons:
- keeps the old overloaded identity in active use too long
- risks future confusion between legacy and target sources of truth

#### Option B: LegacyProductMapping

Pros:
- clean separation of source-of-truth identities
- preserves historical references

Cons:
- requires mapping discipline across services and reports

#### Option C: direct historical snapshot references

Pros:
- strongest historical safety
- works for immutable ledger references

Cons:
- not enough for all old service consumers by itself

#### Option D: hybrid approach

Recommended option:
- `LegacyProductMapping` as the compatibility layer
- `StockLedger` and `OrderItem` should keep historical snapshot references
- legacy `Product` should remain as a read-compatibility source only during transition

### Recommended approach

Use a hybrid:

- keep `Product` table only as compatibility and historical bridge during the transition
- define `LegacyProductMapping` to resolve each legacy product to new domain entities
- preserve historical movement records with snapshot fields
- eventually retire direct legacy reads once all clients are migrated

### Historical records to keep resolvable

- orders
- order items
- stock ledger
- stock transfers
- stock requests
- receiving
- adjustments
- waste
- recipes
- reports

### Querying strategy

Implementation should support a compatibility read pattern such as:

- if `legacyProductId` is present, resolve using `LegacyProductMapping`
- if mapping is missing, default to legacy table data only until migrated

This is safer than forcing all historical reads to be rewritten in a single phase.

---

## 7. Historical Data Safety

Historical safety is not optional. It is the core risk control feature.

### Required design guarantee

Example:

V1:
- 1 Pack = 10 Bottles
- 1 Bottle = 600 ML
- total = 6,000 ML

Receive:
- 10 Packs

Historical stock must remain 60,000 ML even after V2:
- 1 Pack = 12 Bottles
- 1 Pack = 7,200 ML

### Implementation guarantee strategy

The plan should enforce this by:

1. every receiving or stock movement stores a conversion snapshot
2. `PackagingVersion` is immutable after use
3. `StockLedger` stores the normalized base quantity at the time of movement
4. current active packaging configuration is never used to reinterpret historically stored records
5. reporting reads from ledger snapshots and historical references, not the current config

### Snapshot fields required

At minimum, the historical ledger or movement record should store:

- input quantity
- input unit
- packaging configuration id
- packaging version id
- conversion factor used
- normalized quantity in base unit
- base unit
- supplier or supplier offer id
- purchase price or cost at the time
- transaction timestamp
- reference id

### Immutable rules

- once a `PackagingVersion` is referenced by a transaction, it cannot be edited
- once a stock movement is created, it cannot be rewritten
- if a user discovers an error, a new reverse or corrective transaction should be used, not mutation of historical rows

---

## 8. Recipe Migration

### Current repository reality

The current recipe relationship is product-owned in [backend/prisma/schema.prisma](backend/prisma/schema.prisma):

- `Recipe` belongs to `Product` via `productId`
- `RecipeItem` belongs to `Recipe` and to `componentProductId`
- each recipe item also stores `quantity` and `unitId`

### Required target migration

The target should be:

- `SellableProduct` owns the recipe
- `RecipeItem` points at `MaterialVariant`
- recipe quantities are stored in canonical base units

### Migration logic

For each current recipe:

- map `Recipe.productId` to the target sellable product for that finished item
- map `RecipeItem.componentProductId` to the new ingredient `MaterialVariant`
- convert legacy quantities into canonical base units if required
- keep old `Recipe`/`RecipeItem` rows temporarily readable under compatibility mapping if needed

### Recipe compatibility issues

1. current ingredient data stores `unitId` and quantity, but not a versioned recipe notion
2. packaging-based recipe entries are not valid under the target model
3. if a recipe was created from a packaging unit, the migration should reject or convert those to the proper material variant/base quantity model

### Historical correctness requirements

Recipe calculations for old orders must not be recomputed using future recipe versions.

This means:

- recipe versioning is required for history-safe reporting
- order item or production snapshot should retain which recipe version was used

---

## 9. Recipe Versioning Plan

### Requirement

Historical orders must remain tied to the recipe version used at order time.

Example:

Recipe V1:
- 50 ML Milk

Later:

Recipe V2:
- 60 ML Milk

An order created under V1 must still calculate using V1 semantics.

### Minimum safe design

The minimum safe design is:

- `Recipe` has version information
- `RecipeItem` is versioned as part of recipe version
- `OrderItem` snapshots the recipe version used when sold
- reporting uses the order snapshot, not live recipe data

This is the smallest design capable of protecting historical COGS and recipe-consumption reports without introducing a larger manufacturing domain.

### Recommendation

Do not over-engineer with a full manufacturing engine. A recipe-version snapshot on the order item is enough to protect historical metrics.

---

## 10. Inventory Migration

### Current inventory architecture

Current inventory is built on product-level stock and product-level ledgers.

The actual repository evidence is in:

- [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- [backend/src/modules/inventory/service.ts](backend/src/modules/inventory/service.ts)
- [backend/src/modules/inventory/stock.service.ts](backend/src/modules/inventory/stock.service.ts)

Current model:

- `WarehouseStock` keyed by `warehouseId + productId`
- `StockLedger` keyed by `warehouseId + productId`
- `StockTransferItem` keyed by `productId`
- `StockRequestItem` keyed by `productId`
- inventory reads use product-centric filters and stock totals

### Target mapping

The target inventory model should be:

- `InventoryStock` keyed by `warehouseId + materialVariantId`
- `StockLedger` keyed by `warehouseId + materialVariantId`
- transfer/request items keyed to material variant identity

### Specific migration plan

#### WarehouseStock

Current:
- `WarehouseStock.productId`

Target:
- `InventoryStock.materialVariantId`

Why:
- avoids accidental stock sharing across raw-material variants

#### StockLedger

Current:
- `StockLedger.productId`

Target:
- `StockLedger.materialVariantId`
- preserve `packagingConfigurationId` and `packagingVersionId`
- preserve normalized base quantity and base unit

#### StockTransfer

Current:
- transfer item references product

Target:
- `StockTransferItem.materialVariantId`
- preserve conversion snapshot and ledger context

#### StockRequest

Current:
- request item references product

Target:
- request item references material variant and product compatibility if needed

#### Receiving / waste / adjustment / opening stock

These must reference material variant identity and snapshot context.

### Why this matters

The repository currently allows product-level stock totals to hide the difference between material variants, which is exactly what the target architecture must prevent.

---

## 11. Unit Conversion Migration

### Current repository evidence

The conversion logic exists in [backend/src/utils/units.ts](backend/src/utils/units.ts) and the data model in [backend/prisma/schema.prisma](backend/prisma/schema.prisma):

- `ProductUnitConversion` is attached to product
- conversion is product-scoped, not packaging-scoped

### Target mapping

Planned target:

- `PackagingConfiguration` defines packaging conversion rules
- `PackagingVersion` holds effective conversion data
- historical transactions preserve the conversion snapshot at the time of use

### Migration logic

For each current `ProductUnitConversion` row:

- identify the material/variant it belonged to
- map it to the correct packaging configuration or packaging version context
- if the same product had multiple conversion values, keep them under the supplier/packaging configuration structure
- resolve ambiguous rows by supplier or packaging context rather than by generic product

### Deprecation plan

`ProductUnitConversion` should only be deprecated after:

- all conversion data has been moved to packaging configuration/version context
- stock and ledger history has been preserved with conversion snapshots
- all reads are using the new conversion domain

This should not happen in the first migration phase.

---

## 12. Order / POS Migration

### Current repository reality

Current order creation logic in [backend/src/modules/orders/service.ts](backend/src/modules/orders/service.ts) expects:

- `OrderItem.productId`
- product is a sellable item
- only `FINISHED_GOOD` products can be sold through POS
- recipe ingredient stock is computed from product recipe item relations

### Target migration

The target flow should be:

- order item references the sellable product identity
- order item stores a snapshot of price, name, SKU, and recipe context at the time of order
- direct-sale items may additionally include a material-variant reference for stock deduction
- recipe-based items deduct inventory from the recipe ingredients using material variants

### Transition strategy

During migration:

- new API layer can read both the legacy `productId` and the new sellable product context
- old order queries continue to work through compatibility mappings
- order items should become snapshot-first and not depend on live product identity for historical correctness

### Key rule

Historical orders must not reinterpret themselves after a product name, price, or recipe changes.

---

## 13. Order Snapshot

### Mandatory snapshot fields

The order item snapshot should retain at least:

- product name
- SKU
- price
- quantity
- subtotal
- product type
- sellable product id
- material variant id if the item is direct-sale and stock-linked
- recipe id or recipe version if recipe-based
- recipe item snapshot if required for COGS

### Historical correctness requirement

Historical orders must not change meaning when:

- sellable product name changes
- sellable product price changes
- SKU changes
- recipe changes
- material variant changes
- product is discontinued

The record must keep the facts of the original order transaction.

---

## 14. Backend Service Migration Plan

| Current Service | Current Product Dependency | Target Domain | Required Change | Risk |
|---|---|---|---|---|
| [backend/src/modules/products/service.ts](backend/src/modules/products/service.ts) | product CRUD + recipe + conversions | Material / SellableProduct / Recipe | Split service boundaries | Critical |
| [backend/src/modules/inventory/service.ts](backend/src/modules/inventory/service.ts) | product inventory list + summary | InventoryStock + StockLedger | Re-key by material variant | Critical |
| [backend/src/modules/inventory/stock.service.ts](backend/src/modules/inventory/stock.service.ts) | ledger creation by product | ledger creation by material variant | snapshot-safe creation | Critical |
| [backend/src/modules/orders/service.ts](backend/src/modules/orders/service.ts) | sellable stock validation by product recipe | order validation by sellable product + recipe ingredients | snapshot + stock mapping | Critical |
| [backend/src/modules/products/controller.ts](backend/src/modules/products/controller.ts) | product API contract | split product/material/sellable endpoints | High | High |
| [backend/src/modules/products/router.ts](backend/src/modules/products/router.ts) | product route model | split domain routes | Medium | High |
| [backend/src/modules/reports/service.ts](backend/src/modules/reports/service.ts) | product-based inventory and sales reports | material + sellable + ledger reports | High | High |
| [backend/src/modules/warehouses/service.ts](backend/src/modules/warehouses/service.ts) | warehouse stock by product | warehouse stock by material variant | Medium | High |
| [backend/src/modules/units/service.ts](backend/src/modules/units/service.ts) | product unit management | UnitDefinition + variant base unit rules | Medium | Medium |
| [backend/src/utils/units.ts](backend/src/utils/units.ts) | product conversion conversion | packaging conversion + base-unit conversion | Critical | Critical |
| any product validation layer | product shape validation | separate material + sellable validation | High | High |

### Notes

The repository already indicates a service split is necessary because business logic is currently mixed into product-centric functions.

---

## 15. API Migration Plan

### Current product-related APIs

Likely affected endpoints include:

- product CRUD operations
- recipe endpoints
- inventory summary
- stock list
- stock transfer
- stock request
- receiving flows
- reports API
- order API

### Migration choices

Recommended approach:

- create new domain endpoints for material, sellable product, packaging, recipe, and inventory
- maintain old product endpoints temporarily behind a compatibility facade
- avoid hard-breaking clients in the same release window

### Recommended strategy

Use an API compatibility layer with the following behavior:

- old `Product` read requests are mapped to the new domain object model
- write endpoints are accepted only through the compatibility layer until the new domain is stabilized
- report endpoints can be dual-read or old-read until migration is complete

---

## 16. Frontend Migration Plan

### Current frontend assumptions

The front end currently assumes the product row is the single domain of truth.

From [frontend/src/app/(authenticated)/products/page.tsx](frontend/src/app/(authenticated)/products/page.tsx):

- product form contains inventory type, price, cost, trackInventory, baseUnit, unit
- recipe exists on product form and is edited from product screens
- conversion list is attached to product

### Frontend migration table

| Screen | Current Model | Target Model | UX Change | Risk |
|---|---|---|---|---|
| product management page | generic product | material + sellable product manager | High | High |
| product create form | one form | split material vs sellable forms | High | High |
| product update form | one form | split update flow | High | High |
| inventory screen | product-stock list | material-variant stock list | High | High |
| stock receiving | product-based receiving | packaging-aware receiving | Critical | Critical |
| stock transfer | product-based transfer | material variant transfer | High | High |
| stock request | product-based request | material variant request | High | High |
| recipe management | product recipe editor | sellable product recipe editor | High | High |
| report pages | product report rows | material + sellable + ledger views | Medium | High |

### UX implication

The frontend should not expose the domain split all at once. It can temporarily show product-compatible DTOs while the backend migrates.

---

## 17. Mobile Migration Plan

### Current mobile assumption

From [mobile/src/screens/NewOrderScreen.tsx](mobile/src/screens/NewOrderScreen.tsx):

- products are fetched as generic sellable products
- price, availability, and inventory are read from the generic product DTO
- cart uses product id and product name

### Migration target

The mobile app should consume a sellable-product DTO rather than the old generic product model.

### Required compatibility layer

This means:

- new backend API may return a `SellableProduct` or a compatibility product shape
- mobile must not depend on raw material or inventory entity details for normal cashier flow
- direct-sale stock mapping should be hidden behind a compatibility DTO

### Safe transition

- keep the current mobile product DTO working for a release cycle
- map to the sellable product schema behind the API layer
- only later introduce explicit product type and inventory linkage in mobile

---

## 18. Type / DTO Migration

The repository currently has a product shape that is repeated in multiple places.

Key migration work should include:

- product response interface definitions
- product create/update request DTOs
- order item payload types
- inventory response DTOs
- stock report DTOs
- recipe response DTOs
- validation schemas
- shared types in folders such as `shared/types`

### Migration strategy

Use a compatibility DTO layer:

- old `Product` DTO remains readable during migration
- new DTOs are introduced for `Material`, `MaterialVariant`, `SellableProduct`, and `Recipe`
- old UI and mobile clients continue to consume compatibility DTOs while new domain services are introduced

---

## 19. Test Migration Plan

The current tests around product and inventory already reveal product-centric assumptions.

Likely affected existing tests include:

- backend product/service tests
- inventory tests
- order stock tests
- reports tests
- summary tests
- request tests
- unit conversion tests

### Migration principle

The implementation must not rewrite all test behavior at once. Instead:

- preserve legacy compatibility tests while new domain-specific tests are added
- add new tests for material variant stock, packaging history safety, recipe versioning, and order snapshots
- require historical data tests before legacy cleanup

---

## 20. Implementation Phasing

A safe sequence is required to minimize partial-migration instability.

### Phase 0 — preparation and compatibility design

- confirm target domain boundaries
- define compatibility mapping layer
- define historical snapshot fields
- finalize recipe versioning approach
- confirm packaging versioning requirements

### Phase 1 — introduce compatibility layer

- create `LegacyProductMapping`
- maintain old product read paths
- prepare dual-read compatibility warehousing

### Phase 2 — add new domain tables

- add `Brand`
- add `Material`
- add `MaterialVariant`
- add `PackagingConfiguration`
- add `PackagingVersion`
- add `Supplier`
- add `SupplierOffer`
- add `SellableProduct`
- add `Recipe`
- add `RecipeItem`
- add `InventoryStock`
- add `StockLedger` historical snapshot fields

### Phase 3 — migrate inventory identity

- re-key stock/ledger to material variant
- preserve old product references through compatibility mapping
- validate warehouse and ledger balances

### Phase 4 — migrate packaging conversion and historical safety

- move `ProductUnitConversion` meaning into packaging configuration/version structures
- add conversion snapshots to receiving and stock movement records

### Phase 5 — migrate recipe domain

- move recipe ownership to sellable product
- map recipe items to material variants
- add recipe versioning

### Phase 6 — migrate direct-sale and sellable product flow

- create sellable-product records
- map direct-sale items to material variants
- keep compatibility DTOs live

### Phase 7 — migrate order and POS

- update order item creation to sellable product snapshots
- validate order historical snapshots

### Phase 8 — migrate frontend

- product management screens
- inventory screens
- recipe UI
- POS UI

### Phase 9 — migrate mobile

- sellable product listing
- direct-sale compatibility
- cart calculations and stock checks

### Phase 10 — reporting migration

- material reports
- inventory reports
- stock movement reports
- recipe consumption and COGS reports

### Phase 11 — legacy deprecation

- retire old `Product` as source of truth
- disable legacy reads once compatibility is complete
- keep historical bridge for archived data only

---

## 21. Rollback Strategy

Rollback must be part of the implementation plan.

### Required rollback characteristics

- old `Product` rows remain readable until the new domain is fully tested
- dual-read is recommended in early phases
- dual-write is not recommended unless there is no safe way to migrate in one pass
- all new records should preserve a compatibility reference to the old product row where possible
- historical migrations should be append-only and should not delete or rewrite the old ledger

### Safe rollback triggers

- inventory mismatch after conversion migration
- recipe mismatch after sellable-product mapping
- product mapping conflict for legacy rows
- failing order snapshot validation
- reporting differences in summary totals

### Rollback principle

The safest rollback is not destructive. It is to preserve legacy compatibility until the new domain is proven correct.

---

## 22. Data Validation / Reconciliation

Before and after migration, the implementation must reconcile these quantities and relationships:

- total inventory by material variant
- total inventory by warehouse
- stock ledger balance by material variant
- order count and item count
- order totals and item subtotals
- recipe count and ingredient totals
- supplier purchase totals
- sellable-product inventory linkage counts
- direct-sale product link counts
- recipe-based product counts
- legacy product mapping coverage

### Conceptual validation rules

- `InventoryStock.quantity` should equal sum of relevant positive and negative stock movements for that material variant in that warehouse
- `StockLedger` must remain append-only
- product-to-material mapping coverage must be complete for all active stock items
- recipe ingredient quantities must be valid in base units
- order item snapshots must remain stable over time

---

## 23. Performance Review

The new schema will increase the number of joins in the product domain, so indexes must be chosen carefully.

### Required index types

Likely required indexes:

- `MaterialVariant(materialId, isActive)`
- `MaterialVariant(sku)` if used
- `InventoryStock(warehouseId, materialVariantId)` unique
- `StockLedger(warehouseId, materialVariantId, createdAt)`
- `PackagingVersion(packagingConfigurationId, effectiveFrom)`
- `Recipe(sellableProductId, isActive)`
- `RecipeItem(recipeId, materialVariantId)`
- `SellableProduct(categoryId, productType)`
- `LegacyProductMapping(legacyProductId)`
- `OrderItem(orderId)`
- `OrderItem(sellableProductId)`

This is enough for the initial implementation. Over-optimization should be avoided before the domain is validated.

---

## 24. API Compatibility

Existing clients may still expect the old `Product` shape even after the new domain is introduced.

### Safe approach

Use a compatibility facade/DTO:

- old product endpoints continue to work temporarily
- new domain endpoints are introduced for material, variant, recipe, stock, and supplier domains
- compatibility DTOs can map legacy `Product` reads into a sellable-product-like shape

This protects existing frontend and mobile clients without forcing them to be rewritten in the same phase.

---

## 25. Implementation Risk Matrix

| Change | Risk | Complexity | Data Risk | Rollback Difficulty | Recommendation |
|---|---|---|---|---|---|
| Product split into Material + SellableProduct | High | High | High | Medium | Required |
| MaterialVariant inventory identity | High | Medium | High | Medium | Required |
| Packaging versioning | Critical | High | Critical | High | Required |
| Recipe migration | High | High | High | Medium | Required |
| Inventory re-keying | Critical | High | Critical | High | Required |
| Order snapshot rules | High | Medium | High | Medium | Required |
| Frontend migration | Medium | Medium | Medium | Medium | Staged |
| Mobile migration | Medium | Medium | Medium | Medium | Staged |
| API compatibility | Medium | Medium | Medium | Medium | Required |
| Legacy cleanup | High | Medium | High | High | Deferred |

---

## 26. Final Implementation Plan

### A. Architecture assumptions

- Material is physical inventory identity.
- MaterialVariant is actual stocked specification.
- SellableProduct is commercial identity.
- Packaging conversion is supplier and historical context aware.
- InventoryStock and StockLedger are the operational inventory truth.
- Recipes are sellable-product-owned and material-variant-driven.
- Legacy Product references are compatibility only.

### B. Schema changes

The implementation should introduce the domain tables in this order:

1. Brand
2. Material
3. MaterialVariant
4. PackagingConfiguration
5. PackagingVersion
6. Supplier
7. SupplierOffer
8. SellableProduct
9. Recipe
10. RecipeItem
11. InventoryStock
12. StockLedger snapshot fields
13. LegacyProductMapping

### C. Data migration plan

- map legacy `Product` rows into new domain rows
- preserve historical ids and old references
- transform recipe items to base-unit material ingredient records
- move unit conversions to packaging configuration/version model
- split direct-sale and recipe-based sellable product mapping

### D. Backend implementation plan

- split services by domain boundary
- re-key inventory and stock ledgers by material variant
- add compatibility read layer
- create snapshot management for historical records
- rework order validation to use recipe ingredient material variants

### E. API implementation plan

- add new material, inventory, packaging, recipe and sellable product endpoints
- preserve older product endpoints behind compatibility layer
- use DTO-level compatibility for frontend/mobile consumers

### F. Frontend implementation plan

- split product management into material and sellable product flows
- change stock and inventory screens to material-variant oriented screens
- keep compatibility DTOs until the UI is migrated

### G. Mobile implementation plan

- move mobile ordering to sellable-product DTOs
- ensure direct-sale and recipe-based flows are exposed through compatibility layer
- maintain product list behavior while the backend evolves

### H. Test plan

- add tests for packaging-version immutability
- add tests for recipe version snapshots
- add tests for stock ledger normalization
- add tests for inventory reconciliation
- add tests for legacy compatibility reads

### I. Validation / reconciliation plan

- validate total stock by warehouse, material variant, and base unit
- validate order totals with snapshots
- validate stock movement totals against ledger balance
- validate recipe ingredient consumption against product inventory

### J. Rollback strategy

- keep legacy `Product` read compatibility active throughout early migration
- maintain fallback mapping for inventory and order reads
- use append-only stock movement history

### K. Legacy deprecation strategy

- legacy `Product` remains compatibility-only until all clients and reports are migrated
- deprecate old product endpoint usage in stages
- remove legacy product as source of truth only after validation passes

### L. Estimated implementation complexity

- Material and MaterialVariant split: MEDIUM
- Packaging versioning: HIGH
- Supplier packaging: MEDIUM
- Inventory re-keying: HIGH
- Recipe migration: HIGH
- Order snapshot migration: HIGH
- Frontend migration: MEDIUM
- Mobile migration: MEDIUM
- Reporting migration: HIGH
- Legacy cleanup: CRITICAL

---

## 27. File-Level Change Plan

This is the eventual file-level plan for implementation, but not an actual modification list.

| File | Change Type | Reason | Dependency | Risk |
|---|---|---|---|---|
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) | schema extension + mapping | new domain entities and references | critical | critical |
| [backend/src/modules/products/service.ts](backend/src/modules/products/service.ts) | split product service into material/sellable domain services | current product logic is overloaded | high | critical |
| [backend/src/modules/inventory/service.ts](backend/src/modules/inventory/service.ts) | inventory re-key to material variant | current inventory is product-centric | critical | critical |
| [backend/src/modules/inventory/stock.service.ts](backend/src/modules/inventory/stock.service.ts) | ledger snapshot creation | historical correctness | critical | critical |
| [backend/src/modules/orders/service.ts](backend/src/modules/orders/service.ts) | order validation and stock deduction | POS flow tied to product logic | critical | critical |
| [backend/src/utils/units.ts](backend/src/utils/units.ts) | conversion logic replacement | product-level conversions unsafe | critical | critical |
| [backend/src/modules/reports/service.ts](backend/src/modules/reports/service.ts) | reporting domain split | current reports assume product model | high | high |
| [backend/src/modules/products/controller.ts](backend/src/modules/products/controller.ts) | API contract split | product endpoints overloaded | high | high |
| [backend/src/modules/products/router.ts](backend/src/modules/products/router.ts) | route split | service split | medium | medium |
| [backend/src/modules/warehouses/service.ts](backend/src/modules/warehouses/service.ts) | warehouse stock logic | inventory re-keying | medium | high |
| [backend/src/modules/units/service.ts](backend/src/modules/units/service.ts) | unit semantics | base unit ownership | medium | medium |
| [frontend/src/app/(authenticated)/products/page.tsx](frontend/src/app/(authenticated)/products/page.tsx) | product UI split | product model overload in UI | high | high |
| [mobile/src/screens/NewOrderScreen.tsx](mobile/src/screens/NewOrderScreen.tsx) | POS product DTO adaptation | mobile reads sellable product model | medium | medium |
| [backend/src/modules/inventory/requests.service.ts](backend/src/modules/inventory/requests.service.ts) | inventory request mapping | request items tied to product | medium | high |
| [backend/src/modules/inventory/requests.test.ts](backend/src/modules/inventory/requests.test.ts) | tests for request flow | inventory domain split | medium | medium |
| [backend/src/modules/order/...] | order snapshots & validation | historical safety | high | high |
| [shared/types/index.ts](shared/types/index.ts) | DTO compatibility layer | old Product contract | medium | medium |

This list is intentionally not exhaustive in the current repository, but it captures the highest-confidence implementation touchpoints.

---

## 28. Stop Condition

This is a plan-only review. No implementation work is to begin.

IMPLEMENTATION PLAN COMPLETE — NO CODE, SCHEMA, MIGRATION, DATABASE, FRONTEND, MOBILE, OR TEST CHANGES WERE MADE.
