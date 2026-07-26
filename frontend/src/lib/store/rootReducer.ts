import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./features/auth/slice";
import cartReducer from "./features/cart/slice";
import orderReducer from "./features/order/slice";
import paymentReducer from "./features/payment/slice";
import userReducer from "./features/user/slice";
import uiReducer from "./features/ui/slice";
import { baseApi } from "../api/baseApi";

export const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  order: orderReducer,
  payment: paymentReducer,
  user: userReducer,
  ui: uiReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});
export type RootReducerState = ReturnType<typeof rootReducer>;
