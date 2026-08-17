/// <reference path="./types/express.d.ts" />
import express from "express";
import cors from "cors";
import { PORT } from "./config/constant";
import { errorHandler } from "./utils/errorHandler";
import { logger } from "./utils/logger";

// Import Routers
import authRouter from "./modules/auth/router";
import categoriesRouter from "./modules/categories/router";
import productsRouter from "./modules/products/router";
import tablesRouter from "./modules/tables/router";
import taxesRouter from "./modules/taxes/router";
import promotionsRouter from "./modules/promotions/router";
import ordersRouter from "./modules/orders/router";
import paymentsRouter from "./modules/payments/router";
import checkoutRouter from "./modules/checkout/router";
import dashboardRouter from "./modules/dashboard/router";
import reportsRouter from "./modules/reports/router";
import shiftsRouter from "./modules/shifts/router";
import inventoryRouter from "./modules/inventory/router";
import warehousesRouter from "./modules/warehouses/router";
import usersRouter from "./modules/users/router";
import brandsRouter from "./modules/brands/router";
import materialsRouter from "./modules/materials/router";
import suppliersRouter from "./modules/suppliers/router";

const app = express();

// Global Middlewares
const allowedOrigins = [
  "https://fe-concession.168billiard.online",
  "http://127.0.0.1:5051",
  "http://localhost/:5050",
];

app.use(
  cors()
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Mounted Modular Routers
app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/products", productsRouter);
app.use("/api/tables", tablesRouter);
app.use("/api/taxes", taxesRouter);
app.use("/api/promotions", promotionsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/shifts", shiftsRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/warehouses", warehousesRouter);
app.use("/api/users", usersRouter);
app.use("/api/brands", brandsRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/suppliers", suppliersRouter);

import { createServer } from "http";
import { initSocket } from "./utils/socket";

// Global Error Handler Middleware
app.use(errorHandler);

const httpServer = createServer(app);
initSocket(httpServer);

// Boot server
httpServer.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

export default app;
