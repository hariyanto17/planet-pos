import { io, Socket } from "socket.io-client";
import { Platform } from "react-native";

class SocketService {
  private socket: Socket | null = null;

  connect(url: string = Platform.OS === "android" ? "http://10.0.2.2:5001" : "http://localhost:5001") {
    if (!this.socket) {
      this.socket = io(url, {
        autoConnect: false,
      });
    }
    this.socket.connect();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
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
}

export const socketService = new SocketService();
