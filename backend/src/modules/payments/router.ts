import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { getOrderPayments, createPaymentHandler, confirmPaymentHandler } from "./controller";
import { authenticate, optionalAuthenticate } from "../../middleware/authMiddleware";
import { cashierShiftGuard } from "../../middleware/cashierShiftGuard";

const router = Router();

router.get("/", authenticate, catchAsync(getOrderPayments));
router.post("/", optionalAuthenticate, cashierShiftGuard, catchAsync(createPaymentHandler));
router.patch("/:id/confirm", authenticate, cashierShiftGuard, catchAsync(confirmPaymentHandler));

export default router;
