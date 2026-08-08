import React from "react";
import { Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAppSelector } from "../lib/store/hooks";
import { selectIsAuthenticated } from "../lib/store/features/auth/selectors";
import { selectCurrentUser } from "../lib/store/features/auth/selectors";

import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import NewOrderScreen from "../screens/NewOrderScreen";
import CartScreen from "../screens/CartScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import OrderSuccessScreen from "../screens/OrderSuccessScreen";
import OrdersScreen from "../screens/OrdersScreen";
import OrderDetailScreen from "../screens/OrderDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";
import OpenShiftScreen from "../screens/OpenShiftScreen";
import CloseShiftScreen from "../screens/CloseShiftScreen";
import KitchenBottomTabNavigator from "./KitchenBottomTabNavigator";
import KitchenOrderDetailScreen from "../screens/KitchenOrderDetailScreen";
import { KitchenOrderProvider } from "../context/KitchenOrderContext";

export type RootStackParamList = {
  Login: undefined;
  CashierTabs: undefined;
  Home: undefined;
  Orders: undefined;
  Profile: undefined;
  OpenShift: undefined;
  CloseShift: { shiftId: string; expectedCash: number };
  NewOrder: undefined;
  Cart: undefined;
  Checkout: undefined;
  OrderSuccess: {
    displayNumber: string;
    grandTotal: number;
    changeAmount: number;
    paymentMethod: string;
  };
  OrderDetail: { orderId: string; mode: "CASHIER" | "HISTORY" };
  KitchenHome: undefined;
  KitchenOrderDetail: { orderId: string };
};

export type CashierTabParamList = {
  Home: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<CashierTabParamList>();

function CashierTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#18181b",
          borderTopColor: "#27272a",
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#818cf8",
        tabBarInactiveTintColor: "#71717a",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "bold",
        },
        tabBarIcon: ({ color }) => {
          let iconStr = "";
          if (route.name === "Home") iconStr = "🏠";
          else if (route.name === "Orders") iconStr = "📋";
          else if (route.name === "Profile") iconStr = "👤";
          return <Text style={{ color, fontSize: 18 }}>{iconStr}</Text>;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "Beranda" }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ tabBarLabel: "Pesanan" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: "Profil" }} />
    </Tab.Navigator>
  );
}

import { socketService } from "../services/socket";

export default function AppNavigator() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectCurrentUser);
  const token = useAppSelector((state) => state.auth.token);

  React.useEffect(() => {
    if (isAuthenticated && token && currentUser?.role === "KITCHEN") {
      socketService.connect(token);
    } else {
      socketService.disconnect();
    }
    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, token, currentUser]);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : currentUser?.role === "KITCHEN" ? (
          <>
            <Stack.Screen name="KitchenHome">
              {() => (
                <KitchenOrderProvider>
                  <KitchenBottomTabNavigator />
                </KitchenOrderProvider>
              )}
            </Stack.Screen>
            <Stack.Screen name="KitchenOrderDetail" component={KitchenOrderDetailScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="CashierTabs" component={CashierTabNavigator} />
            <Stack.Screen name="OpenShift" component={OpenShiftScreen} />
            <Stack.Screen name="CloseShift" component={CloseShiftScreen} />
            <Stack.Screen name="NewOrder" component={NewOrderScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
