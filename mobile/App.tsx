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
      <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
        <ThemeProvider>
          <SafeAreaProvider>
            <ToastProvider>
              <ConfirmationProvider>
                <AppNavigator />
              </ConfirmationProvider>
            </ToastProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
