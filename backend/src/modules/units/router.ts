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

router.get("/", requireRoles(["ADMIN", "WAREHOUSE"]), catchAsync(getUnits));
router.get("/:id", requireRoles(["ADMIN", "WAREHOUSE"]), catchAsync(getUnit));
router.post("/", requireRoles(["ADMIN"]), catchAsync(createUnitHandler));
router.put("/:id", requireRoles(["ADMIN"]), catchAsync(updateUnitHandler));
router.delete("/:id", requireRoles(["ADMIN"]), catchAsync(deactivateUnitHandler));

export default router;
