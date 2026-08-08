import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authMiddleware";
import {
  getSummary,
  getProducts,
  getMovements,
  receiveStock,
  adjustStock,
  removeWaste,
  getWarehouses,
  getUnits,
  recordOpening,
  createStockTransferHandler,
  completeStockTransferHandler,
  getStockTransfersHandler,
} from "./controller";

const router = Router();

// All inventory endpoints require authentication
router.use(authenticate);

// Read endpoints: ADMIN, WAREHOUSE, ACCOUNTING, and CASHIER
router.get("/summary", requireRoles(["ADMIN", "WAREHOUSE", "ACCOUNTING"]), getSummary);
router.get("/products", requireRoles(["ADMIN", "WAREHOUSE", "ACCOUNTING", "CASHIER", "KITCHEN"]), getProducts);
router.get("/movements", requireRoles(["ADMIN", "WAREHOUSE", "ACCOUNTING", "CASHIER", "KITCHEN"]), getMovements);
router.get("/warehouses", requireRoles(["ADMIN", "WAREHOUSE", "ACCOUNTING", "CASHIER", "KITCHEN"]), getWarehouses);
router.get("/units", requireRoles(["ADMIN", "WAREHOUSE", "ACCOUNTING", "CASHIER", "KITCHEN"]), getUnits);

// Mutating endpoints: WAREHOUSE and ADMIN only
router.post("/opening", requireRoles(["ADMIN", "WAREHOUSE"]), recordOpening);
router.post("/receive", requireRoles(["ADMIN", "WAREHOUSE"]), receiveStock);
router.post("/adjust", requireRoles(["ADMIN", "WAREHOUSE"]), adjustStock);
router.post("/waste", requireRoles(["ADMIN", "WAREHOUSE"]), removeWaste);
router.get("/transfer", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), getStockTransfersHandler);
router.post("/transfer", requireRoles(["ADMIN", "WAREHOUSE"]), createStockTransferHandler);
router.post("/transfer/:id/complete", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), completeStockTransferHandler);

export default router;
