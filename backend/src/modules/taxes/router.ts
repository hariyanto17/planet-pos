import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getTaxes,
  getTax,
  createTaxHandler,
  updateTaxHandler,
  deleteTaxHandler,
} from "./controller";
import { authenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.get("/", authenticate, catchAsync(getTaxes));
router.get("/:id", authenticate, catchAsync(getTax));
router.post("/", authenticate, authorize("ADMIN"), catchAsync(createTaxHandler));
router.put("/:id", authenticate, authorize("ADMIN"), catchAsync(updateTaxHandler));
router.delete("/:id", authenticate, authorize("ADMIN"), catchAsync(deleteTaxHandler));

export default router;
