import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getSummary,
  getSales,
  getPayments,
  getReconciliation,
  getProducts,
  getPaymentAudit,
  getOrderAudit,
  getSnapshot,
  getShifts,
  getCashierShiftReport,
  getDailyAnalysis,
  getMonthlyAnalysis,
} from "./controller";
import { authenticate, requireRoles } from "../../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

// Cashier Shift Report is accessible by CASHIER, ADMIN, ACCOUNTING
router.get("/cashier-shift-report", requireRoles(["CASHIER", "ADMIN", "ACCOUNTING"]), catchAsync(getCashierShiftReport));

// Daily and Monthly Analysis are accessible by ADMIN and ACCOUNTING
router.get("/daily-analysis", requireRoles(["ADMIN", "ACCOUNTING"]), catchAsync(getDailyAnalysis));
router.get("/monthly-analysis", requireRoles(["ADMIN", "ACCOUNTING"]), catchAsync(getMonthlyAnalysis));

// All other summary/audit endpoints require ADMIN or ACCOUNTING
router.use(requireRoles(["ADMIN", "ACCOUNTING"]));

router.get("/summary", catchAsync(getSummary));
router.get("/sales", catchAsync(getSales));
router.get("/payments", catchAsync(getPayments));
router.get("/reconciliation", catchAsync(getReconciliation));
router.get("/products", catchAsync(getProducts));
router.get("/audit/payments", catchAsync(getPaymentAudit));
router.get("/audit/orders", catchAsync(getOrderAudit));
router.get("/snapshot", catchAsync(getSnapshot));
router.get("/shifts", catchAsync(getShifts));

export default router;
