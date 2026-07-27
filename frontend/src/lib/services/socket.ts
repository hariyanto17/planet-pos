import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;

  connect(url: string = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:5001") {
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
