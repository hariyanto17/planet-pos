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

// Set to true only when testing against local dev backend on localhost/10.0.2.2
export const USE_LOCAL_SERVER = false;

export const getApiBaseUrl = (): string => {
  return USE_LOCAL_SERVER ? ENDPOINTS.LOCAL_API_BASE_URL : ENDPOINTS.API_BASE_URL;
};

export const getSocketUrl = (): string => {
  return USE_LOCAL_SERVER ? ENDPOINTS.LOCAL_SOCKET_URL : ENDPOINTS.SOCKET_URL;
};
