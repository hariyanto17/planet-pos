import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { checkoutHandler } from "./controller";
import { optionalAuthenticate } from "../../middleware/authMiddleware";
import { selfOrderShiftGuard } from "../../middleware/selfOrderShiftGuard";

const router = Router();

router.post("/", optionalAuthenticate, selfOrderShiftGuard, catchAsync(checkoutHandler));

export default router;
