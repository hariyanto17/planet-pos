import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getProducts,
  getProduct,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
} from "./controller";
import { authenticate, optionalAuthenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.get("/", optionalAuthenticate, catchAsync(getProducts));
router.get("/:id", optionalAuthenticate, catchAsync(getProduct));
router.post("/", authenticate, authorize("ADMIN"), catchAsync(createProductHandler));
router.put("/:id", authenticate, authorize("ADMIN"), catchAsync(updateProductHandler));
router.delete("/:id", authenticate, authorize("ADMIN"), catchAsync(deleteProductHandler));

export default router;
