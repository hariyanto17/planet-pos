import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { catchAsync } from "../../utils/catchAsyc";
import crypto from "crypto";

const router = Router();

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

const authenticateInternal = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-platform-internal-key"]?.toString();
  const expectedKey = process.env.PLATFORM_INTERNAL_API_KEY || "platform-internal-secret-key-123";

  let isMatch = false;
  if (apiKey) {
    const aBuf = Buffer.from(apiKey);
    const bBuf = Buffer.from(expectedKey);
    if (aBuf.length === bBuf.length) {
      isMatch = crypto.timingSafeEqual(aBuf, bBuf);
    }
  }

  if (!isMatch) {
    return next(new AppError("UNAUTHORIZED", "Invalid or missing internal service credential"));
  }

  next();
};

router.use(authenticateInternal);

router.get("/summary", catchAsync(async (req: Request, res: Response) => {
  const dateStr = req.query.date ? req.query.date.toString() : new Date().toISOString().split("T")[0];
  const start = new Date(dateStr);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setUTCHours(23, 59, 59, 999);

  const [orders, itemsAggr] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: "COMPLETED",
        businessDate: { gte: start, lte: end },
      },
      select: {
        grandTotal: true,
      },
    }),
    prisma.orderItem.aggregate({
      where: {
        order: {
          status: "COMPLETED",
          businessDate: { gte: start, lte: end },
        },
      },
      _sum: {
        quantity: true,
      },
    }),
  ]);

  const transactions = orders.length;
  const revenue = orders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
  const itemsSold = itemsAggr._sum.quantity || 0;
  const averageTransaction = transactions > 0 ? revenue / transactions : 0;

  res.status(200).json({
    status: "success",
    message: "Concession operational summary retrieved successfully",
    data: {
      revenue,
      transactions,
      itemsSold,
      averageTransaction,
    },
  });
}));

router.get("/activity", catchAsync(async (req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["COMPLETED", "CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      cashier: { select: { fullName: true } },
    },
  });

  const activities = orders.map((o) => ({
    id: `concession-${o.id}`,
    source: "CONCESSION",
    type: "TRANSACTION",
    title: o.status === "COMPLETED" ? "Concession sale completed" : "Concession order cancelled",
    description: `${o.displayNumber || o.orderNumber} • ${formatRupiah(Number(o.grandTotal))} by ${o.cashier?.fullName || "Self-Order"}`,
    timestamp: o.createdAt.toISOString(),
    status: o.status,
    amount: Number(o.grandTotal),
    referenceId: o.id,
  }));

  res.status(200).json({
    status: "success",
    message: "Concession activity retrieved successfully",
    data: activities,
  });
}));

router.get("/transactions", catchAsync(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page?.toString() || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit?.toString() || "20", 10)));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (req.query.status) {
    where.status = req.query.status.toString();
  } else {
    where.status = { in: ["COMPLETED", "CANCELLED"] };
  }

  if (req.query.date) {
    const dateStr = req.query.date.toString();
    const start = new Date(dateStr);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setUTCHours(23, 59, 59, 999);
    where.businessDate = { gte: start, lte: end };
  }

  if (req.query.search) {
    const search = req.query.search.toString();
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { displayNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        cashier: { select: { fullName: true } },
        items: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  const transactions = orders.map((o) => ({
    id: o.id,
    source: "CONCESSION",
    transactionNumber: o.displayNumber || o.orderNumber,
    status: o.status,
    amount: Number(o.grandTotal),
    currency: "IDR",
    itemCount: o.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
    timestamp: o.createdAt.toISOString(),
    customerName: o.customerName || null,
    cashierName: o.cashier?.fullName || "Self-Order",
  }));

  res.status(200).json({
    status: "success",
    message: "Concession transactions retrieved successfully",
    data: {
      transactions,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    },
  });
}));

export default router;
