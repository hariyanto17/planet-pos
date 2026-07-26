/**
 * Concessions POS Mobile Client entry point
 */

import React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./src/lib/store/store";
import AppNavigator from "./src/navigation/AppNavigator";
import { LoadingSpinner } from "./src/components/LoadingSpinner";
import { ToastProvider } from "./src/components/ToastProvider";
import { ConfirmationProvider } from "./src/components/ConfirmationProvider";

function App() {
  const isDarkMode = useColorScheme() === "dark";

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
        <SafeAreaProvider>
          <ToastProvider>
            <ConfirmationProvider>
              <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
              <AppNavigator />
            </ConfirmationProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
