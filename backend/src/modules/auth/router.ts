import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { loginHandler, getMeHandler } from "./controller";
import { authenticate } from "../../middleware/authMiddleware";

const router = Router();

router.post("/login", catchAsync(loginHandler));
router.get("/me", authenticate, catchAsync(getMeHandler));

export default router;
