import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import KDSScreen from "../screens/KDS/KDSScreen";
import KitchenWarehouseScreen from "../screens/KitchenWarehouse/KitchenWarehouseScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import { MonitorIcon, PackageIcon, UserIcon } from "../components/CustomIcons";

export type KitchenTabParamList = {
  KDS: undefined;
  Warehouse: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<KitchenTabParamList>();

export default function KitchenBottomTabNavigator() {
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
          if (route.name === "KDS") {
            return <MonitorIcon color={color} />;
          } else if (route.name === "Warehouse") {
            return <PackageIcon color={color} />;
          } else if (route.name === "Profile") {
            return <UserIcon color={color} />;
          }
          return null;
        },
      })}
    >
      <Tab.Screen
        name="KDS"
        component={KDSScreen}
        options={{ tabBarLabel: "KDS" }}
      />
      <Tab.Screen
        name="Warehouse"
        component={KitchenWarehouseScreen}
        options={{ tabBarLabel: "Gudang" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
