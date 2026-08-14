import { OrderType } from "@shared/types";

export interface CartItem {
  sellableProductId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

export interface CartState {
  customerName: string;
  tableId: string | null;
  validatedTable: { id: string; name: string } | null;
  orderType: OrderType;
  notes: string;
  items: CartItem[];
}
