# Backend Folder Structure Documentation

This document describes the directory structure, file organization, and architectural design patterns used in the `pos-retail` backend application.

---

## 📂 Overview of Directory Tree

Below is the directory layout of the `backend` workspace:

```text
backend/
├── prisma/                    # Prisma ORM Database Configuration
│   ├── migrations/            # SQL migration history files
│   └── schema.prisma          # Database schema models definitions
├── src/                       # TypeScript Source Code
│   ├── app.ts                 # Application entry point & route definition
│   ├── config/                # Global configuration and constants
│   │   └── constant.ts        # Port, JWT secret, and env-based constants
│   ├── generated/             # Auto-generated client codes
│   │   └── prisma/            # Generated Prisma client types
│   ├── middleware/            # Centralized Express middlewares
│   │   ├── authMiddleware.ts  # JWT extraction & user session verification
│   │   └── authorize.ts       # Role-based access control (RBAC) authorization
│   ├── modules/               # Feature modules (Domain-Driven design)
│   │   ├── auth/              # Authenticaton module (Login, Me profile)
│   │   ├── products/          # Product Catalog, images, & barcodes
│   │   ├── sales/             # Transaction flow & receipts
│   │   ├── picking-orders/    # Order picking pipeline for warehouse
│   │   └── ... (21 modules total)
│   ├── seeds/                 # Seed scripts for development database
│   │   └── userSeeder.ts      # Seeder file for initial user data
│   ├── types/                 # Custom type declarations
│   │   └── express.d.ts       # Declares custom Request.user types
│   └── utils/                 # Shared utilities and helper functions
│       ├── activityLogger.ts  # Database audit trail helper
│       ├── catchAsyc.ts       # Utility to catch async function exceptions
│       ├── errorHandler.ts    # Express global error handler
│       ├── prisma.ts          # Centralized Prisma Client instance
│       └── responeHandler.ts  # Custom JSON API response wrappers
├── .env                       # Environment variables config (local only)
├── tsconfig.json              # TypeScript compilation rules & path aliases
└── package.json               # Dependencies, scripts, and project metadata
```

---

## 🔍 Detailed Folder Descriptions

### 1. [prisma/](file:///Users/hari/Documents/pos-retail/backend/prisma)
Houses all configurations for database connection, indexing, and ORM schemas.
* **[schema.prisma](file:///Users/hari/Documents/pos-retail/backend/prisma/schema.prisma)**: The single source of truth for the database layout. Defines PostgreSQL tables, columns, relations, and settings.
* **[migrations/](file:///Users/hari/Documents/pos-retail/backend/prisma/migrations)**: Auto-generated SQL files tracking incremental database schema adjustments over time.

### 2. [src/](file:///Users/hari/Documents/pos-retail/backend/src)
The container for application source code.
* **[app.ts](file:///Users/hari/Documents/pos-retail/backend/src/app.ts)**: Configures the Express application, sets up CORS whitelist rules, initializes static directories, attaches global middlewares, registers modular routers under `/api`, and starts the HTTP/Socket.io server.
* **[config/](file:///Users/hari/Documents/pos-retail/backend/src/config)**: Config files. Contains [constant.ts](file:///Users/hari/Documents/pos-retail/backend/src/config/constant.ts) which defines port numbers, JWT secrets, and other shared settings.
* **[middleware/](file:///Users/hari/Documents/pos-retail/backend/src/middleware)**: Shared Express interceptors:
  * [authMiddleware.ts](file:///Users/hari/Documents/pos-retail/backend/src/middleware/authMiddleware.ts): Parses incoming `Authorization` headers, verifies the JWT, and binds the payload to the request object.
  * [authorize.ts](file:///Users/hari/Documents/pos-retail/backend/src/middleware/authorize.ts): Authorizes requests based on user roles (`OWNER`, `ADMIN`, `CASHIER`, `WAREHOUSE`, `PICKER`).
* **[modules/](file:///Users/hari/Documents/pos-retail/backend/src/modules)**: Implements feature-oriented modular architecture (see [Feature Modules Pattern](#-feature-modules-pattern) section below).
* **[seeds/](file:///Users/hari/Documents/pos-retail/backend/src/seeds)**: Contains DB seeding scripts. Run using `npm run seed`.
* **[types/](file:///Users/hari/Documents/pos-retail/backend/src/types)**: Global TypeScript definition overlays. [express.d.ts](file:///Users/hari/Documents/pos-retail/backend/src/types/express.d.ts) extends Express `Request` interface to safely attach the `user` session payload (e.g. `req.user.role`).
* **[utils/](file:///Users/hari/Documents/pos-retail/backend/src/utils)**: Shared, domain-agnostic helpers. Examples:
  * [prisma.ts](file:///Users/hari/Documents/pos-retail/backend/src/utils/prisma.ts): exports a single database client connection instance.
  * [responeHandler.ts](file:///Users/hari/Documents/pos-retail/backend/src/utils/responeHandler.ts): formats standardized success payloads.
  * [errorHandler.ts](file:///Users/hari/Documents/pos-retail/backend/src/utils/errorHandler.ts): handles catch-all formatting of server faults.

---

## 🛠️ Feature Modules Pattern

Instead of storing controllers, routers, and validations in globally scoped folders at the project root, this codebase follows a **modular architecture**. Each business domain (module) resides inside [src/modules/](file:///Users/hari/Documents/pos-retail/backend/src/modules) and contains all logic necessary to serve its endpoints.

### Anatomy of a Module (e.g., `auth/` or `products/`)
Each module directory typically comprises the following 5 files:

1. **`router.ts`**
   * Declares Express endpoints for the module.
   * Leverages middleware functions (like `authenticate` and `authorize`) to guard specific routes.
   * Connects incoming routes to the matching controller functions.
2. **`controller.ts`**
   * Acts as the entry and exit gate for HTTP requests.
   * Extracts parameters (`req.params`, `req.query`, `req.body`).
   * Calls service functions to execute actual logic.
   * Formats the response envelope (using helper functions in [responeHandler.ts](file:///Users/hari/Documents/pos-retail/backend/src/utils/responeHandler.ts)).
3. **`service.ts`**
   * Encapsulates core business rules and database queries.
   * Interacts with Prisma Client to read or write database records.
   * Contains calculations, stock manipulation, transactions, and reservation mutation logic.
4. **`validation.ts`**
   * Declares schema schemas (using Joi validation library) defining the required payload structure.
   * Validates user inputs before processing in the controller to prevent SQL injection, invalid data types, or missing fields.
5. **`interface.ts`**
   * Defines TypeScript typings and interfaces specific to the module's parameters and internal structures.

---

## ⚙️ Key Configuration Files

* **[package.json](file:///Users/hari/Documents/pos-retail/backend/package.json)**: Manages dependencies (Express, Prisma, Joi, Winston, Socket.io, etc.) and lists script task shortcuts:
  * `npm run dev`: Boots the API server using `ts-node` under live watch.
  * `npm run build`: Compiles TS into plain JavaScript inside the `/dist` output directory.
  * `npm run start`: Runs compiled production build server.
  * `npm run seed`: Seeds database with initial mock users.
* **[tsconfig.json](file:///Users/hari/Documents/pos-retail/backend/tsconfig.json)**: Sets up compiler configurations (targets ES2022, enables type checking rules, and registers module path resolution).
