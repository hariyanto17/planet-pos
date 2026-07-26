import { EventEmitter } from "events";
import { logger } from "./logger";

export const domainEvents = new EventEmitter();

export const DOMAIN_EVENTS = {
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_PREPARING: "ORDER_PREPARING",
  ORDER_READY: "ORDER_READY",
  ORDER_COMPLETED: "ORDER_COMPLETED",
  PAYMENT_PAID: "PAYMENT_PAID",
};

// Log all domain events for traceability
Object.values(DOMAIN_EVENTS).forEach((event) => {
  domainEvents.on(event, (data) => {
    logger.info(`[Domain Event] ${event}: ${JSON.stringify(data)}`);
  });
});
