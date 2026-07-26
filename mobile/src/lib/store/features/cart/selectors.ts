import { RootState } from "../../store";
import { CartItem } from "./types";

export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartCustomerName = (state: RootState) => state.cart.customerName;
export const selectCartTableId = (state: RootState) => state.cart.tableId;
export const selectCartOrderType = (state: RootState) => state.cart.orderType;
export const selectCartNotes = (state: RootState) => state.cart.notes;

export const selectCartTotalItems = (state: RootState) =>
  state.cart.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);

export const selectCartSubtotal = (state: RootState) =>
  state.cart.items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);

export const selectCartValidatedTable = (state: RootState) => state.cart.validatedTable;
