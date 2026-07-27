import createWebStorage from "redux-persist/lib/storage/createWebStorage";

/* eslint-disable @typescript-eslint/no-unused-vars */
const createNoopStorage = () => {
  return {
    getItem(key: string) {
      return Promise.resolve(null);
    },
    setItem(key: string, value: unknown) {
      return Promise.resolve(value);
    },
    removeItem(key: string) {
      return Promise.resolve();
    },
  };
};
/* eslint-enable @typescript-eslint/no-unused-vars */

const storage = typeof window !== "undefined" ? createWebStorage("local") : createNoopStorage();

export const persistConfig = {
  key: "concession-pos",
  storage,
  whitelist: ["auth", "cart"],
};
