import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { selfOrderShiftGuard } from "./selfOrderShiftGuard";
import { AppError } from "../utils/errorHandler";
import { Request, Response } from "express";

const prisma = new PrismaClient();

test("selfOrderShiftGuard Tests", async (t) => {
  // Find or create a user to associate with shifts
  const testUser = await prisma.user.findFirst() || await prisma.user.create({
    data: {
      username: "guard_test_user",
      fullName: "Guard Test User",
      passwordHash: "dummy",
      role: "CASHIER",
    },
  });

  // Ensure all active shifts are cleaned up or closed for clean testing environment
  await prisma.cashierShift.updateMany({
    where: { status: "OPEN" },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  await t.test("should fail when no active cashier shifts exist", async () => {
    let nextCalledWithError: any = null;
    const req = {} as Request;
    const res = {} as Response;
    const next = (err?: any) => {
      nextCalledWithError = err;
    };

    await selfOrderShiftGuard(req, res, next);

    assert.ok(nextCalledWithError instanceof AppError);
    assert.equal(nextCalledWithError.httpStatus, 403);
    assert.equal(nextCalledWithError.code, "FORBIDDEN");
    assert.equal(nextCalledWithError.message, "No active cashier shift");
  });

  await t.test("should succeed when at least one active cashier shift exists", async () => {
    // Open a cashier shift
    const shift = await prisma.cashierShift.create({
      data: {
        userId: testUser.id,
        status: "OPEN",
        openingCash: 50000,
        openedAt: new Date(),
      },
    });

    try {
      let nextCalledWithError: any = null;
      const req = {} as Request;
      const res = {} as Response;
      const next = (err?: any) => {
        nextCalledWithError = err;
      };

      await selfOrderShiftGuard(req, res, next);

      assert.equal(nextCalledWithError, undefined, "next should be called without error");
    } finally {
      // Clean up the created shift
      await prisma.cashierShift.delete({
        where: { id: shift.id },
      });
    }
  });

  // Re-seed shifts after test to preserve DB state
  await prisma.cashierShift.create({
    data: {
      userId: testUser.id,
      status: "OPEN",
      openingCash: 50000,
      openedAt: new Date(),
    },
  });
});
