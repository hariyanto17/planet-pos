import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getOrders,
  getOrdersQueue,
  getPendingPaymentsHandler,
  getOrder,
  createOrderHandler,
  updateOrderStatusHandler,
} from "./controller";
import { authenticate, optionalAuthenticate } from "../../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, catchAsync(getOrders));
router.get("/queue", authenticate, catchAsync(getOrdersQueue));
router.get("/pending-payment", authenticate, catchAsync(getPendingPaymentsHandler));
router.get("/:id", optionalAuthenticate, catchAsync(getOrder));
router.post("/", optionalAuthenticate, catchAsync(createOrderHandler));
router.patch("/:id/status", authenticate, catchAsync(updateOrderStatusHandler));

export default router;
