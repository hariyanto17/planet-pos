import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CartState, CartItem } from "./types";
import { OrderType } from "@shared/types";

const initialState: CartState = {
  customerName: "",
  tableId: null,
  validatedTable: null,
  orderType: "DINE_IN",
  notes: "",
  items: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      // Find item with same productId AND same note
      const existing = state.items.find(
        (i) => i.productId === action.payload.productId && (i.note || "") === (action.payload.note || "")
      );
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
    },
    removeItem: (state, action: PayloadAction<{ productId: string; note?: string }>) => {
      state.items = state.items.filter(
        (i) => !(i.productId === action.payload.productId && (i.note || "") === (action.payload.note || ""))
      );
    },
    updateQuantity: (
      state,
      action: PayloadAction<{ productId: string; note?: string; quantity: number }>
    ) => {
      const item = state.items.find(
        (i) => i.productId === action.payload.productId && (i.note || "") === (action.payload.note || "")
      );
      if (item) {
        item.quantity = action.payload.quantity;
      }
    },
    updateItemNote: (
      state,
      action: PayloadAction<{ productId: string; oldNote?: string; newNote: string }>
    ) => {
      const item = state.items.find(
        (i) => i.productId === action.payload.productId && (i.note || "") === (action.payload.oldNote || "")
      );
      if (item) {
        item.note = action.payload.newNote;
      }
    },
    setCustomerName: (state, action: PayloadAction<string>) => {
      state.customerName = action.payload;
    },
    setValidatedTable: (state, action: PayloadAction<{ id: string; name: string } | null>) => {
      state.validatedTable = action.payload;
      state.tableId = action.payload ? action.payload.id : null;
    },
    setCustomerInfo: (
      state,
      action: PayloadAction<{ customerName: string; tableId?: string | null; orderType: OrderType; notes?: string }>
    ) => {
      state.customerName = action.payload.customerName;
      state.tableId = action.payload.tableId ?? state.tableId;
      state.orderType = action.payload.orderType;
      state.notes = action.payload.notes ?? "";
    },
    clearCart: (state) => {
      state.items = [];
      state.customerName = "";
      state.tableId = null;
      state.validatedTable = null;
      state.orderType = "DINE_IN";
      state.notes = "";
    },
  },
});

export const {
  addItem,
  removeItem,
  updateQuantity,
  updateItemNote,
  setCustomerName,
  setValidatedTable,
  setCustomerInfo,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
