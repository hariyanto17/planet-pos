import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getWarehouses,
  getWarehouse,
  createWarehouseHandler,
  updateWarehouseHandler,
  deactivateWarehouseHandler,
} from "./controller";
import { authenticate, requireRoles } from "../../middleware/authMiddleware";

const router = Router();

router.use(authenticate);
router.use(requireRoles(["ADMIN", "WAREHOUSE"]));

router.get("/", catchAsync(getWarehouses));
router.get("/:id", catchAsync(getWarehouse));
router.post("/", catchAsync(createWarehouseHandler));
router.put("/:id", catchAsync(updateWarehouseHandler));
router.delete("/:id", catchAsync(deactivateWarehouseHandler));

export default router;
