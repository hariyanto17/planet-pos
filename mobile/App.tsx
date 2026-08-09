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

import { ThemeProvider } from "./src/theme";

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
          <SafeAreaProvider>
            <ToastProvider>
              <ConfirmationProvider>
                <AppNavigator />
              </ConfirmationProvider>
            </ToastProvider>
          </SafeAreaProvider>
        </PersistGate>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
