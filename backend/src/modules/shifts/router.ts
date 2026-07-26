import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  openShiftHandler,
  getCurrentShiftHandler,
  getShiftReconciliationHandler,
  closeShiftHandler,
} from "./controller";
import { authenticate } from "../../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.post("/open", catchAsync(openShiftHandler));
router.get("/current", catchAsync(getCurrentShiftHandler));
router.get("/:id/reconciliation", catchAsync(getShiftReconciliationHandler));
router.post("/:id/close", catchAsync(closeShiftHandler));

export default router;
