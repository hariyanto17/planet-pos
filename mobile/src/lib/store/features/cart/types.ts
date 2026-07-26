import { OrderType } from "@shared/types";

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  note?: string;
}

export interface CartState {
  customerName: string;
  tableId: string | null;
  validatedTable: { id: string; name: string } | null;
  orderType: OrderType;
  notes: string;
  items: CartItem[];
}
