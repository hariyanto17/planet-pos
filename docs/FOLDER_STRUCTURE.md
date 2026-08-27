# Concession POS — Folder Structure Documentation

This document describes the standardized directory structure, file organization, and architectural design patterns used in the `consession` backend and frontend applications.

---

## 📂 Backend Architecture (`consession/backend`)

```text
backend/
├── prisma/                    # Prisma ORM Database Configuration & Seeders
│   ├── migrations/            # SQL migration history files
│   ├── schema.prisma          # Database schema models definitions
│   └── uatSeed.ts             # UAT seeding script
├── src/
│   ├── app.ts                 # Express application configuration & router mounts
│   ├── config/                # Environment variables and database config
│   │   ├── env.ts             # Port, JWT secret, and env-based constants
│   │   └── prisma.ts          # Centralized Prisma Client instance
│   ├── middleware/            # Centralized Express middlewares
│   │   ├── authMiddleware.ts  # Session token & SSO verification
│   │   ├── errorHandler.ts    # Global error handler
│   │   └── validationMiddleware.ts # Joi / Zod validation middleware
│   ├── modules/               # Domain-Driven feature modules
│   │   ├── auth/              # Authentication & SSO sync
│   │   ├── categories/        # Menu categories
│   │   ├── checkout/          # Point of Sale checkout & payment processing
│   │   ├── internal/          # Platform reporting & telemetry endpoints
│   │   ├── inventory/         # Stock levels, movements, and adjustments
│   │   ├── orders/            # Orders lifecycle & kitchen tickets
│   │   ├── products/          # Products, recipes, and material variants
│   │   ├── reports/           # Financial & operational sales reports
│   │   ├── shifts/            # Cashier shifts & cash drawer management
│   │   ├── suppliers/         # Vendor & supplier management
│   │   ├── tables/            # Dine-in table management
│   │   ├── users/             # Local cashiers and staff users
│   │   └── warehouses/        # Storage locations & stock balance
│   ├── types/                 # Custom TypeScript type declarations
│   └── utils/                 # Shared utilities and helper functions
│       ├── catchAsync.ts      # Asynchronous handler exception wrapper
│       ├── errorHandler.ts    # AppError definition
│       ├── jwt.ts             # Token signing & verification
│       ├── logger.ts          # Logging utility
│       └── responseHandler.ts # Standardized JSON API response wrappers
├── .env                       # Environment variables config
├── tsconfig.json              # TypeScript compilation rules
└── package.json               # Dependencies and scripts
```

---

## 📂 Frontend Architecture (`consession/frontend`)

```text
frontend/
├── src/
│   ├── app/                   # Next.js 16 App Router pages & layouts
│   │   ├── (authenticated)/   # Protected dashboard, inventory, orders, reports routes
│   │   ├── (guest)/           # Login page
│   │   ├── self-order/        # Customer self-ordering interface
│   │   └── sso/               # SSO exchange callback route
│   ├── components/            # Reusable UI & layout components
│   │   ├── layout/            # Layout shells, headers, and navigation
│   │   └── ui/                # Base UI components (Button, Input, Modal, DatePicker, etc.)
│   ├── lib/                   # Integrations, Redux, and API clients
│   │   ├── api/               # RTK Query API slices
│   │   ├── store/             # Redux Toolkit store, rootReducer, slices, hooks
│   │   └── utils/             # Formatters, auth cookie handlers, and calculation helpers
│   ├── locales/               # Bilingual i18n dictionaries (id.ts, en.ts, index.tsx)
│   ├── providers/             # React context providers (Language, Store, Theme, Toast)
│   └── types/                 # Shared TypeScript frontend types
├── .env                       # Frontend environment configuration
├── tsconfig.json              # TypeScript compiler configuration
└── package.json               # Dependencies and scripts
```
