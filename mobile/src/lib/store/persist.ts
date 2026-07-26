import AsyncStorage from "@react-native-async-storage/async-storage";

export const persistConfig = {
  key: "concession-pos-mobile",
  storage: AsyncStorage,
  whitelist: ["auth", "cart"],
};
