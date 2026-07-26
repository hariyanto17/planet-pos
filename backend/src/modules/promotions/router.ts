import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getPromotions,
  getPromotion,
  createPromotionHandler,
  updatePromotionHandler,
  deletePromotionHandler,
} from "./controller";
import { authenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.get("/", authenticate, catchAsync(getPromotions));
router.get("/:id", authenticate, catchAsync(getPromotion));
router.post("/", authenticate, authorize("ADMIN"), catchAsync(createPromotionHandler));
router.put("/:id", authenticate, authorize("ADMIN"), catchAsync(updatePromotionHandler));
router.delete("/:id", authenticate, authorize("ADMIN"), catchAsync(deletePromotionHandler));

export default router;
