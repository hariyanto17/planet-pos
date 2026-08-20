import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import WarehouseInventoryScreen from "../screens/Warehouse/WarehouseInventoryScreen";
import WarehouseTransfersScreen from "../screens/Warehouse/WarehouseTransfersScreen";
import WarehouseRequestsScreen from "../screens/Warehouse/WarehouseRequestsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { PackageIcon, ListIcon, UserIcon, HomeIcon } from "../components/CustomIcons";
import { useTheme } from "../theme";

export type WarehouseTabParamList = {
  WarehouseInventory: undefined;
  WarehouseTransfers: undefined;
  WarehouseRequests: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<WarehouseTabParamList>();

export default function WarehouseBottomTabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "bold",
        },
        tabBarIcon: ({ color }) => {
          if (route.name === "WarehouseInventory") {
            return <PackageIcon color={color} />;
          } else if (route.name === "WarehouseTransfers") {
            return <HomeIcon color={color} />;
          } else if (route.name === "WarehouseRequests") {
            return <ListIcon color={color} />;
          } else if (route.name === "Profile") {
            return <UserIcon color={color} />;
          }
          return null;
        },
      })}
    >
      <Tab.Screen
        name="WarehouseInventory"
        component={WarehouseInventoryScreen}
        options={{ tabBarLabel: "Stok" }}
      />
      <Tab.Screen
        name="WarehouseTransfers"
        component={WarehouseTransfersScreen}
        options={{ tabBarLabel: "Transfer" }}
      />
      <Tab.Screen
        name="WarehouseRequests"
        component={WarehouseRequestsScreen}
        options={{ tabBarLabel: "Permintaan" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profil" }}
      />
    </Tab.Navigator>
  );
}
