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

router.get("/", requireRoles(["ADMIN", "WAREHOUSE"]), catchAsync(getWarehouses));
router.get("/:id", requireRoles(["ADMIN", "WAREHOUSE"]), catchAsync(getWarehouse));
router.post("/", requireRoles(["ADMIN"]), catchAsync(createWarehouseHandler));
router.put("/:id", requireRoles(["ADMIN"]), catchAsync(updateWarehouseHandler));
router.delete("/:id", requireRoles(["ADMIN"]), catchAsync(deactivateWarehouseHandler));

export default router;
