import { io, Socket } from "socket.io-client";
import { Platform } from "react-native";

class SocketService {
  private socket: Socket | null = null;

  connect(token: string, url?: string) {
    const defaultUrl = url || (__DEV__
      ? (Platform.OS === "android" ? "https://be-concession.168billiard.online" : "http://localhost:5001")
      : "https://be-concession.168billiard.online");

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(defaultUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  onConnect(callback: () => void) {
    this.socket?.on("connect", callback);
  }

  onDisconnect(callback: (reason: string) => void) {
    this.socket?.on("disconnect", callback);
  }

  onConnectError(callback: (err: any) => void) {
    this.socket?.on("connect_error", callback);
  }
}

export const socketService = new SocketService();
