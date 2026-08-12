export type UserRole = "ADMIN" | "ACCOUNTING" | "CASHIER" | "KITCHEN" | "WAREHOUSE";
export type OrderType = "DINE_IN" | "TAKEAWAY";
export type OrderSource = "SELF_ORDER" | "CASHIER";
export type OrderStatus = "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "CASH" | "QRIS";
export type PaymentStatus = "PENDING" | "PAID" | "CANCELLED";
export type PromotionType = "PERCENT" | "PACKAGE";

// Auth Types
export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    role: UserRole;
  };
}

// Category Types
export interface CreateCategoryInput {
  name: string;
}

export interface UpdateCategoryInput {
  name?: string;
  isActive?: boolean;
}

// Product Types
export interface CreateProductInput {
  categoryId: string;
  sku?: string;
  name: string;
  imageUrl?: string;
  price?: number | null;
  cost?: number | null;
  trackInventory?: boolean;
  inventoryType?: "FINISHED_GOOD" | "RAW_MATERIAL" | "PACKAGING";
  minimumStock?: number;
  unitId?: string;
  baseUnit?: "G" | "ML" | "PCS" | null;
}

export interface UpdateProductInput {
  categoryId?: string;
  sku?: string;
  name?: string;
  imageUrl?: string;
  price?: number | null;
  cost?: number | null;
  isActive?: boolean;
  trackInventory?: boolean;
  inventoryType?: "FINISHED_GOOD" | "RAW_MATERIAL" | "PACKAGING";
  minimumStock?: number;
  unitId?: string;
  baseUnit?: "G" | "ML" | "PCS" | null;
  unitConversions?: Array<{
    unit: string;
    baseQuantity: number;
    isDefault?: boolean;
  }>;
}

// Table Types
export interface CreateTableInput {
  code: string;
  name: string;
}

export interface UpdateTableInput {
  code?: string;
  name?: string;
  isActive?: boolean;
}

// Tax Types
export interface CreateTaxInput {
  name: string;
  percentage: number;
}

export interface UpdateTaxInput {
  name?: string;
  percentage?: number;
  isActive?: boolean;
}

// Promotion Types
export interface PromotionItemInput {
  productId: string;
  quantity: number;
}

export interface CreatePromotionInput {
  name: string;
  type: PromotionType;
  percentValue?: number;
  packagePrice?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  priority?: number;
  stackable?: boolean;
  items?: PromotionItemInput[];
}

export interface UpdatePromotionInput {
  name?: string;
  type?: PromotionType;
  percentValue?: number;
  packagePrice?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  isActive?: boolean;
  priority?: number;
  stackable?: boolean;
  items?: PromotionItemInput[];
}

// Order Types
export interface OrderItemInput {
  productId: string;
  quantity: number;
  note?: string;
}

export interface CreateOrderInput {
  customerName: string;
  tableId?: string;
  orderType: OrderType;
  notes?: string;
  items: OrderItemInput[];
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
}

// Payment Types
export interface CreatePaymentInput {
  orderId: string;
  method: PaymentMethod;
  amount: number;
  estimatedCash?: number;
  receivedCash?: number;
  referenceNumber?: string;
}

export function getInventoryStatus(
  trackInventory: boolean,
  quantity: number,
  minimumStock: number
): "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NEGATIVE_STOCK" {
  if (!trackInventory) return "IN_STOCK";
  if (quantity < 0) return "NEGATIVE_STOCK";
  if (quantity <= 0) return "OUT_OF_STOCK";
  if (quantity <= minimumStock) return "LOW_STOCK";
  return "IN_STOCK";
}
