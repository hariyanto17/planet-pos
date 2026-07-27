import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getUnits,
  getUnit,
  createUnitHandler,
  updateUnitHandler,
  deactivateUnitHandler,
} from "./controller";
import { authenticate, requireRoles } from "../../middleware/authMiddleware";

const router = Router();

router.use(authenticate);
router.use(requireRoles(["ADMIN", "WAREHOUSE"]));

router.get("/", catchAsync(getUnits));
router.get("/:id", catchAsync(getUnit));
router.post("/", catchAsync(createUnitHandler));
router.put("/:id", catchAsync(updateUnitHandler));
router.delete("/:id", catchAsync(deactivateUnitHandler));

export default router;
