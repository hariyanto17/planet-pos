import { Platform } from "react-native";

export const ENDPOINTS = {
  // Ecosystem Web & Control Plane URLs
  PLATFORM_DASHBOARD_URL: "https://cinema.168billiard.online",
  TICKETING_APP_URL: "https://ticket.168billiard.online",
  CONCESSION_WEB_URL: "https://concession.168billiard.online",

  // Concession Server Production API & WebSocket
  API_BASE_URL: "https://api-concession.168billiard.online/api",
  SOCKET_URL: "https://api-concession.168billiard.online",

  // Local Development Fallbacks
  LOCAL_API_BASE_URL: Platform.OS === "android" ? "http://10.0.2.2:5050/api" : "http://localhost:5050/api",
  LOCAL_SOCKET_URL: Platform.OS === "android" ? "http://10.0.2.2:5050" : "http://localhost:5050",
};

// Default to the production Concession API in dev builds.
// Set to true only when you explicitly want to point the app to the local emulator/backend.
export const USE_LOCAL_SERVER = false;

export const getApiBaseUrl = (): string => {
  const override = (globalThis as any)?.__MOBILE_API_BASE_URL__ || process.env.MOBILE_API_BASE_URL;
  if (override) {
    return override.replace(/\/+$/, "");
  }

  return USE_LOCAL_SERVER ? ENDPOINTS.LOCAL_API_BASE_URL : ENDPOINTS.API_BASE_URL;
};

export const getSocketUrl = (): string => {
  const override = (globalThis as any)?.__MOBILE_SOCKET_URL__ || process.env.MOBILE_SOCKET_URL;
  if (override) {
    return override.replace(/\/+$/, "");
  }

  return USE_LOCAL_SERVER ? ENDPOINTS.LOCAL_SOCKET_URL : ENDPOINTS.SOCKET_URL;
};
