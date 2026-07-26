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
} from "./controller";
import { authenticate, requireRoles } from "../../middleware/authMiddleware";

const router = Router();

router.use(authenticate);
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
