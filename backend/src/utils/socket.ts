import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/constant";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";
import { domainEvents, DOMAIN_EVENTS } from "./eventEmitter";

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Socket middleware for authentication
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        return next(new Error("Authentication failed: User inactive or not found"));
      }

      socket.data = {
        userId: user.id,
        role: user.role,
      };

      next();
    } catch (err) {
      return next(new Error("Authentication failed: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const { userId, role } = socket.data;
    logger.info(`[Socket] User connected: ${userId} (${role})`);

    // Kitchen users join the kitchen room
    if (role === "KITCHEN") {
      socket.join("kitchen");
      logger.info(`[Socket] User ${userId} joined room: kitchen`);
    }

    socket.on("disconnect", () => {
      logger.info(`[Socket] User disconnected: ${userId}`);
    });
  });

  // Listen to domain events and emit to Socket.IO kitchen room
  domainEvents.on(DOMAIN_EVENTS.ORDER_PREPARING, async (data) => {
    emitOrderEvent("order.created", data.orderId);
  });

  domainEvents.on(DOMAIN_EVENTS.ORDER_READY, async (data) => {
    emitOrderEvent("order.updated", data.orderId);
  });

  domainEvents.on(DOMAIN_EVENTS.ORDER_COMPLETED, async (data) => {
    emitOrderEvent("order.updated", data.orderId);
  });

  logger.info("Socket.IO initialized successfully");
};

async function emitOrderEvent(eventName: string, orderId: string) {
  if (!io) return;

  try {
    // Fetch full order structure consistent with getKitchenQueue
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        displayNumber: true,
        customerName: true,
        orderType: true,
        source: true,
        createdAt: true,
        status: true,
        notes: true,
        table: {
          select: {
            id: true,
            name: true,
          },
        },
        payments: {
          select: {
            id: true,
            method: true,
            status: true,
          },
        },
        items: {
          select: {
            id: true,
            productName: true,
            productSku: true,
            quantity: true,
            note: true,
          },
        },
      },
    });

    if (order) {
      io.to("kitchen").emit(eventName, { order });
      logger.info(`[Socket] Emitted event ${eventName} for order ${order.displayNumber}`);
    }
  } catch (err) {
    logger.error(`[Socket] Error emitting event ${eventName} for order ${orderId}:`, err);
  }
}
export default initSocket;
