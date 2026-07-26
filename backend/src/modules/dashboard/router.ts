import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { getDashboardStatsHandler } from "./controller";
import { authenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "ACCOUNTING"),
  catchAsync(getDashboardStatsHandler)
);

export default router;
