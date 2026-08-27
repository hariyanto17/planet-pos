import test from "node:test";
import assert from "node:assert/strict";
import { validateConcessionReportQuery } from "./reports/validation";
import { getProductPerformanceReport } from "./reports/service";

test("Concession Internal Product Report Validation & Execution", async (t) => {
  await t.test("Validation: rejects missing or invalid startDate/endDate", () => {
    assert.throws(
      () => validateConcessionReportQuery({}),
      /startDate is required/
    );

    assert.throws(
      () => validateConcessionReportQuery({ startDate: "invalid-date", endDate: "2026-08-27" }),
      /Invalid date format/
    );

    assert.throws(
      () => validateConcessionReportQuery({ startDate: "2026-08-30", endDate: "2026-08-01" }),
      /startDate cannot be after endDate/
    );
  });

  await t.test("Validation: parses pagination, search, and category filters", () => {
    const valid = validateConcessionReportQuery({
      startDate: "2026-08-01",
      endDate: "2026-08-27",
      page: "3",
      limit: "15",
      search: "Popcorn",
      categoryId: "cat-beverage",
    });

    assert.strictEqual(valid.startDate, "2026-08-01");
    assert.strictEqual(valid.endDate, "2026-08-27");
    assert.strictEqual(valid.page, 3);
    assert.strictEqual(valid.limit, 15);
    assert.strictEqual(valid.search, "Popcorn");
    assert.strictEqual(valid.categoryId, "cat-beverage");
  });

  await t.test("Product Report Service: returns valid schema and metrics envelope", async () => {
    const result = await getProductPerformanceReport({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      page: 1,
      limit: 10,
    });

    assert.ok(result, "Result should exist");
    assert.ok(Array.isArray(result.data), "data must be an array");
    assert.ok(result.summary, "summary must exist");
    assert.ok(result.pagination, "pagination must exist");
    assert.strictEqual(typeof result.summary.totalRevenue, "number");
    assert.strictEqual(typeof result.summary.totalQuantitySold, "number");

    for (const item of result.data) {
      assert.ok(item.productId, "productId must exist");
      assert.ok(item.productName, "productName must exist");
      assert.ok(typeof item.grossRevenue === "number");
      assert.ok(typeof item.netRevenue === "number");
      assert.ok(typeof item.revenueShare === "number");
    }
  });
});
