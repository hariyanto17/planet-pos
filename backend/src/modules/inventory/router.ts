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
import * as requestsController from "./requests.controller";

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
router.post("/opening", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), recordOpening);
router.post("/receive", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), receiveStock);
router.post("/adjust", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), adjustStock);
router.post("/waste", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), removeWaste);
router.get("/transfer", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), getStockTransfersHandler);
router.post("/transfer", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), createStockTransferHandler);
router.post("/transfer/:id/complete", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), completeStockTransferHandler);

// Stock Request endpoints
router.get("/requests", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), requestsController.getStockRequests);
router.post("/requests", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), requestsController.createStockRequest);
router.post("/requests/:id/claim", requireRoles(["ADMIN", "WAREHOUSE"]), requestsController.claimStockRequest);
router.post("/requests/:id/ship", requireRoles(["ADMIN", "WAREHOUSE"]), requestsController.shipStockRequest);
router.post("/requests/:id/receive", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), requestsController.receiveStockRequest);
router.post("/requests/:id/accept", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), requestsController.acceptStockRequest);
router.post("/requests/:id/cancel", requireRoles(["ADMIN", "WAREHOUSE", "KITCHEN"]), requestsController.cancelStockRequest);

export default router;
