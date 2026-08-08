import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getUsers,
  createUserHandler,
  updateUserHandler,
  updateUserStatusHandler,
  resetUserPasswordHandler
} from "./controller";
import { authenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

// Apply auth and ADMIN role requirement globally to this router
router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/", catchAsync(getUsers));
router.post("/", catchAsync(createUserHandler));
router.put("/:id", catchAsync(updateUserHandler));
router.patch("/:id/status", catchAsync(updateUserStatusHandler));
router.post("/:id/reset-password", catchAsync(resetUserPasswordHandler));

export default router;
