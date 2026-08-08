import React from "react";
import { View } from "react-native";

interface IconProps {
  color: string;
  size?: number;
}

export function MonitorIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      <View
        style={{
          width: 20,
          height: 13,
          borderWidth: 2,
          borderColor: color,
          borderRadius: 2,
        }}
      />
      <View style={{ width: 2, height: 3, backgroundColor: color }} />
      <View style={{ width: 10, height: 2, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

export function PackageIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
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

export function HomeIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      <View
        style={{
          width: 16,
          height: 14,
          borderWidth: 2,
          borderColor: color,
          borderBottomWidth: 0,
          position: "relative",
          borderTopWidth: 0,
        }}
      >
        {/* Roof */}
        <View
          style={{
            position: "absolute",
            top: -6,
            left: -4,
            width: 20,
            height: 2,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            top: -6,
            right: -4,
            width: 20,
            height: 2,
            backgroundColor: color,
            transform: [{ rotate: "-45deg" }],
          }}
        />
        {/* Door */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 4,
            width: 4,
            height: 6,
            borderWidth: 2,
            borderColor: color,
            borderBottomWidth: 0,
          }}
        />
      </View>
    </View>
  );
}

export function ListIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center", gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
          <View style={{ width: 12, height: 2, backgroundColor: color, borderRadius: 1 }} />
        </View>
      ))}
    </View>
  );
}

export function CartIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      <View style={{ width: 20, height: 18, position: "relative" }}>
        {/* Cart Basket */}
        <View
          style={{
            position: "absolute",
            top: 2,
            left: 3,
            width: 14,
            height: 10,
            borderWidth: 2,
            borderColor: color,
            borderBottomLeftRadius: 3,
            borderBottomRightRadius: 3,
          }}
        />
        {/* Handle bar */}
        <View
          style={{
            position: "absolute",
            top: 2,
            left: 0,
            width: 5,
            height: 2,
            backgroundColor: color,
          }}
        />
        {/* Wheels */}
        <View
          style={{
            position: "absolute",
            bottom: 1,
            left: 4,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 1,
            right: 4,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

export function SearchIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      <View style={{ width: 16, height: 16, position: "relative" }}>
        {/* Lens circle */}
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: color,
          }}
        />
        {/* Handle */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 6,
            height: 2,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
      </View>
    </View>
  );
}

export function CloseIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      <View style={{ width: 14, height: 14, position: "relative" }}>
        <View
          style={{
            position: "absolute",
            top: 6,
            left: 0,
            width: 14,
            height: 2,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 6,
            left: 0,
            width: 14,
            height: 2,
            backgroundColor: color,
            transform: [{ rotate: "-45deg" }],
          }}
        />
      </View>
    </View>
  );
}

export function WarningIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      <View style={{ width: 18, height: 18, position: "relative", alignItems: "center" }}>
        {/* Triangle approximation */}
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 9,
            borderRightWidth: 9,
            borderBottomWidth: 16,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: color,
            position: "absolute",
            top: 0,
          }}
        />
        {/* Exclamation point mark */}
        <View
          style={{
            width: 2,
            height: 6,
            backgroundColor: "#09090b",
            position: "absolute",
            top: 5,
          }}
        />
        <View
          style={{
            width: 2,
            height: 2,
            backgroundColor: "#09090b",
            position: "absolute",
            top: 12,
            borderRadius: 1,
          }}
        />
      </View>
    </View>
  );
}

export function CheckIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      <View style={{ width: 16, height: 16, position: "relative" }}>
        {/* Left tick segment */}
        <View
          style={{
            position: "absolute",
            bottom: 4,
            left: 2,
            width: 6,
            height: 2,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
        {/* Right tick segment */}
        <View
          style={{
            position: "absolute",
            bottom: 7,
            left: 5,
            width: 10,
            height: 2,
            backgroundColor: color,
            transform: [{ rotate: "-45deg" }],
          }}
        />
      </View>
    </View>
  );
}

export function ArrowLeftIcon({ color }: IconProps) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      <View style={{ width: 16, height: 16, position: "relative", justifyContent: "center" }}>
        {/* Shaft */}
        <View style={{ width: 14, height: 2, backgroundColor: color, alignSelf: "center" }} />
        {/* Arrowheads */}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 4,
            width: 6,
            height: 2,
            backgroundColor: color,
            transform: [{ rotate: "-45deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            left: 0,
            bottom: 4,
            width: 6,
            height: 2,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
      </View>
    </View>
  );
}
