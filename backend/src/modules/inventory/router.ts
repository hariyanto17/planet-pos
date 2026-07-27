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
} from "./controller";

const router = Router();

// All inventory endpoints require authentication
router.use(authenticate);

// Read endpoints: ADMIN, WAREHOUSE, ACCOUNTING, and CASHIER
router.get("/summary", requireRoles(["ADMIN", "WAREHOUSE", "ACCOUNTING"]), getSummary);
router.get("/products", requireRoles(["ADMIN", "WAREHOUSE", "ACCOUNTING", "CASHIER"]), getProducts);
router.get("/movements", requireRoles(["ADMIN", "WAREHOUSE", "ACCOUNTING", "CASHIER"]), getMovements);
router.get("/warehouses", requireRoles(["ADMIN", "WAREHOUSE", "ACCOUNTING", "CASHIER"]), getWarehouses);
router.get("/units", requireRoles(["ADMIN", "WAREHOUSE", "ACCOUNTING", "CASHIER"]), getUnits);

// Mutating endpoints: WAREHOUSE and ADMIN only
router.post("/opening", requireRoles(["ADMIN", "WAREHOUSE"]), recordOpening);
router.post("/receive", requireRoles(["ADMIN", "WAREHOUSE"]), receiveStock);
router.post("/adjust", requireRoles(["ADMIN", "WAREHOUSE"]), adjustStock);
router.post("/waste", requireRoles(["ADMIN", "WAREHOUSE"]), removeWaste);

export default router;
