import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { checkoutHandler } from "./controller";
import { optionalAuthenticate } from "../../middleware/authMiddleware";
import { cashierShiftGuard } from "../../middleware/cashierShiftGuard";

const router = Router();

router.post("/", optionalAuthenticate, cashierShiftGuard, catchAsync(checkoutHandler));

export default router;
