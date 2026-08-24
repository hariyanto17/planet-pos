import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { loginHandler, getMeHandler, changePasswordHandler, ssoCallbackHandler } from "./controller";
import { authenticate } from "../../middleware/authMiddleware";

const router = Router();

router.post("/login", catchAsync(loginHandler));
router.post("/sso", catchAsync(ssoCallbackHandler));
router.get("/me", authenticate, catchAsync(getMeHandler));
router.post("/change-password", authenticate, catchAsync(changePasswordHandler));

export default router;
