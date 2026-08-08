import React from "react";
import { View } from "react-native";

interface IconProps {
  color: string;
  size?: number;
}

export function MonitorIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      {/* Screen */}
      <View
        style={{
          width: 20,
          height: 13,
          borderWidth: 2,
          borderColor: color,
          borderRadius: 2,
        }}
      />
      {/* Stand Neck */}
      <View
        style={{
          width: 2,
          height: 3,
          backgroundColor: color,
        }}
      />
      {/* Stand Base */}
      <View
        style={{
          width: 10,
          height: 2,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
    </View>
  );
}

export function PackageIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      {/* Box Outer Shape */}
      <View
        style={{
          width: 18,
          height: 16,
          borderWidth: 2,
          borderColor: color,
          borderRadius: 2,
          position: "relative",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Horizontal dividing line */}
        <View
          style={{
            position: "absolute",
            top: 5,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: color,
          }}
        />
        {/* Vertical dividing line */}
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 8,
            width: 2,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

export function UserIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      {/* User Head */}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: color,
          marginBottom: 2,
        }}
      />
      {/* User Shoulders */}
      <View
        style={{
          width: 16,
          height: 6,
          borderWidth: 2,
          borderColor: color,
          borderBottomWidth: 0,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      />
    </View>
  );
}
