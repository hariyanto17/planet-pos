import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import { getBrands, createBrand } from "./controller";
import { authenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.get("/", authenticate, catchAsync(getBrands));
router.post("/", authenticate, authorize("ADMIN"), catchAsync(createBrand));

export default router;
