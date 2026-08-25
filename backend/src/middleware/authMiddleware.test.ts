/// <reference path="../types/express.d.ts" />
import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { authenticate } from "./authMiddleware";
import { JWT_SECRET } from "../config/constant";
import { AppError } from "../utils/errorHandler";
import { Request, Response } from "express";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test("authMiddleware Tests", async (t) => {
  // Setup user with platformUserId
  const testUser = await prisma.user.findFirst({ where: { username: "middleware_test_user" } }) || await prisma.user.create({
    data: {
      username: "middleware_test_user",
      fullName: "Middleware Test User",
      passwordHash: "dummy",
      role: "CASHIER",
      platformUserId: "platform-uuid-concession-test",
      isActive: true,
    },
  });

  const originalFetch = globalThis.fetch;

  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test("should succeed with valid platform credentials and sync role", async () => {
    const token = jwt.sign({ id: testUser.id, username: testUser.username, role: testUser.role }, JWT_SECRET);

    globalThis.fetch = async (url: any, init: any) => {
      return {
        status: 200,
        ok: true,
        json: async () => ({
          status: "success",
          data: {
            id: testUser.platformUserId,
            status: "ACTIVE",
            application: {
              code: "CONCESSION",
              role: "CONCESSION_ADMINISTRATOR",
              permissions: [],
            },
          },
        }),
      } as any;
    };

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as Request;
    const res = {} as Response;
    let nextError: any = null;
    const next = (err?: any) => {
      nextError = err;
    };

    await authenticate(req, res, next);

    assert.equal(nextError, undefined);
    assert.ok((req as any).user);
    assert.equal((req as any).user.role, "ADMIN");
    
    const updated = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert.equal(updated?.role, "ADMIN");
  });

  await t.test("should fail with 401 when platform access is revoked", async () => {
    await prisma.user.update({
      where: { id: testUser.id },
      data: { isActive: true },
    });

    const token = jwt.sign({ id: testUser.id, username: testUser.username, role: "CASHIER" }, JWT_SECRET);

    globalThis.fetch = async () => {
      return {
        status: 403,
        ok: false,
      } as any;
    };

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as Request;
    const res = {} as Response;
    let nextError: any = null;
    const next = (err?: any) => {
      nextError = err;
    };

    await authenticate(req, res, next);

    assert.ok(nextError instanceof AppError);
    assert.equal(nextError.httpStatus, 401);
    
    const updated = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert.equal(updated?.isActive, false);
  });

  // Cleanup test user
  await prisma.user.deleteMany({
    where: { username: "middleware_test_user" },
  });
});
