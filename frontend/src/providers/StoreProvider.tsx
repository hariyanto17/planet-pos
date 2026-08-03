"use client";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../lib/store/store";
import React from "react";

import { LoadingSpinner } from "../components/LoadingSpinner";
import { ToastProvider } from "../components/ToastProvider";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </PersistGate>
    </Provider>
  );
}

