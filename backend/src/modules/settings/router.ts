import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { getAppSettings, updateAppSettings } from "./controller";
import { authenticate, optionalAuthenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.get("/", optionalAuthenticate, catchAsync(getAppSettings));
router.put("/", authenticate, authorize("ADMIN"), catchAsync(updateAppSettings));

export default router;
