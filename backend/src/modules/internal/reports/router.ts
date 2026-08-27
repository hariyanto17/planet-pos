import { Router } from "express";
import { catchAsync } from "../../../utils/catchAsyc";
import * as controller from "./controller";

const router = Router();

router.get("/products", catchAsync(controller.getProductPerformanceHandler));

export default router;
