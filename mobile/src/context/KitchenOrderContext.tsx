import React, { createContext, useContext } from "react";
import { useGetOrdersQueueQuery } from "../lib/api/orderApi";
import { useIsFocused } from "@react-navigation/native";

interface KitchenOrderContextType {
  activeOrders: any[];
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
}

const KitchenOrderContext = createContext<KitchenOrderContextType | undefined>(undefined);

export const KitchenOrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isFocused = useIsFocused();

  const { data: orders = [], isLoading, isFetching, refetch } = useGetOrdersQueueQuery(
    undefined,
    {
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  return (
    <KitchenOrderContext.Provider value={{ activeOrders: orders, isLoading, isFetching, refetch }}>
      {children}
    </KitchenOrderContext.Provider>
  );
};

export const useKitchenOrders = () => {
  const context = useContext(KitchenOrderContext);
  if (!context) {
    throw new Error("useKitchenOrders must be used within a KitchenOrderProvider");
  }
  return context;
};
