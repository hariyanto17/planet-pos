import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getCategories,
  getCategory,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from "./controller";
import { authenticate, optionalAuthenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.get("/", optionalAuthenticate, catchAsync(getCategories));
router.get("/:id", optionalAuthenticate, catchAsync(getCategory));
router.post("/", authenticate, authorize("ADMIN"), catchAsync(createCategoryHandler));
router.put("/:id", authenticate, authorize("ADMIN"), catchAsync(updateCategoryHandler));
router.delete("/:id", authenticate, authorize("ADMIN"), catchAsync(deleteCategoryHandler));

export default router;
