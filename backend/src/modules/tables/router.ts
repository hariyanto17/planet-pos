import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getTables,
  getTable,
  createTableHandler,
  updateTableHandler,
  deleteTableHandler,
} from "./controller";
import { authenticate, optionalAuthenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.get("/", authenticate, catchAsync(getTables));
router.get("/:id", optionalAuthenticate, catchAsync(getTable));
router.post("/", authenticate, authorize("ADMIN"), catchAsync(createTableHandler));
router.put("/:id", authenticate, authorize("ADMIN"), catchAsync(updateTableHandler));
router.delete("/:id", authenticate, authorize("ADMIN"), catchAsync(deleteTableHandler));

export default router;
