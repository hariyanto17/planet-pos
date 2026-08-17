import { Router } from "express";
import { catchAsync } from "../../utils/catchAsyc";
import {
  getMaterials,
  getMaterialVariants,
  createMaterial,
  updateMaterial,
  createMaterialVariant,
  updateMaterialVariant,
  deleteMaterialVariant,
  getSupplierOffersByVariant,
  createSupplierOffer,
  deleteSupplierOffer,
  getPackagingByVariant,
  createPackaging,
  updatePackagingConfiguration,
  createNewPackagingVersion
} from "./controller";
import { authenticate } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.get("/", authenticate, catchAsync(getMaterials));
router.get("/variants", authenticate, catchAsync(getMaterialVariants));
router.post("/", authenticate, authorize("ADMIN"), catchAsync(createMaterial));
router.put("/:id", authenticate, authorize("ADMIN"), catchAsync(updateMaterial));
router.post("/:materialId/variants", authenticate, authorize("ADMIN"), catchAsync(createMaterialVariant));

// Variant Specific PUT & DELETE
router.put("/variants/:id", authenticate, authorize("ADMIN"), catchAsync(updateMaterialVariant));
router.delete("/variants/:id", authenticate, authorize("ADMIN"), catchAsync(deleteMaterialVariant));

// Supplier Offers REST endpoints
router.get("/variants/:variantId/supplier-offers", authenticate, catchAsync(getSupplierOffersByVariant));
router.post("/variants/:variantId/supplier-offers", authenticate, authorize("ADMIN"), catchAsync(createSupplierOffer));
router.delete("/supplier-offers/:id", authenticate, authorize("ADMIN"), catchAsync(deleteSupplierOffer));

// Packaging Configuration & Versions REST endpoints
router.get("/variants/:variantId/packaging", authenticate, catchAsync(getPackagingByVariant));
router.post("/variants/:variantId/packaging", authenticate, authorize("ADMIN"), catchAsync(createPackaging));
router.put("/packaging-configurations/:id", authenticate, authorize("ADMIN"), catchAsync(updatePackagingConfiguration));
router.post("/packaging-configurations/:id/versions", authenticate, authorize("ADMIN"), catchAsync(createNewPackagingVersion));

export default router;
