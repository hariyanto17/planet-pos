import { UserRole } from "@shared/types";

export type WorkspaceType = "ADMIN" | "WAREHOUSE" | "CASHIER" | "KITCHEN" | "ACCOUNTING";

// Permission Matrix mapping UserRole -> Workspaces they can access
export const ROLE_WORKSPACES: Record<UserRole, WorkspaceType[]> = {
  ADMIN: ["ADMIN", "WAREHOUSE"],
  WAREHOUSE: ["WAREHOUSE"],
  CASHIER: ["CASHIER"],
  KITCHEN: ["KITCHEN"],
  ACCOUNTING: ["ACCOUNTING"],
};

// Default Workspace for each role when landing or accessing generic routes
export const DEFAULT_WORKSPACE: Record<UserRole, WorkspaceType> = {
  ADMIN: "ADMIN",
  WAREHOUSE: "WAREHOUSE",
  CASHIER: "CASHIER",
  KITCHEN: "KITCHEN",
  ACCOUNTING: "ACCOUNTING",
};

// Default route for each workspace
export const WORKSPACE_DEFAULT_ROUTES: Record<WorkspaceType, string> = {
  ADMIN: "/dashboard",
  WAREHOUSE: "/warehouse/dashboard",
  CASHIER: "/shifts",
  KITCHEN: "/kitchen",
  ACCOUNTING: "/reports",
};

export interface RouteConfig {
  path: string;
  workspace?: WorkspaceType; // undefined means common route accessible to all authenticated roles (e.g. /profile, /access-denied)
}

export const ROUTES_CONFIG: RouteConfig[] = [
  // Common paths
  { path: "/profile" },
  { path: "/access-denied" },

  // Admin Workspace Routes
  { path: "/dashboard", workspace: "ADMIN" },
  { path: "/orders", workspace: "ADMIN" },
  { path: "/products", workspace: "ADMIN" },
  { path: "/categories", workspace: "ADMIN" },
  { path: "/promotions", workspace: "ADMIN" },
  { path: "/tables", workspace: "ADMIN" },
  { path: "/users", workspace: "ADMIN" },
  { path: "/inventory", workspace: "ADMIN" },

  // Warehouse Workspace Routes
  { path: "/warehouse/dashboard", workspace: "WAREHOUSE" },
  { path: "/warehouse/current-stock", workspace: "WAREHOUSE" },
  { path: "/warehouse/opening", workspace: "WAREHOUSE" },
  { path: "/warehouse/settings/units", workspace: "WAREHOUSE" },
  { path: "/warehouse/settings/warehouses", workspace: "WAREHOUSE" },

  // Cashier Workspace Routes
  { path: "/shifts", workspace: "CASHIER" },

  // Kitchen Workspace Routes
  { path: "/kitchen", workspace: "KITCHEN" },

  // Accounting Workspace Routes
  { path: "/reports", workspace: "ACCOUNTING" },
];

export interface SidebarItemConfig {
  name: string;
  href: string;
  iconName: string;
}

export const SIDEBAR_CONFIGS: Record<WorkspaceType, SidebarItemConfig[]> = {
  ADMIN: [
    { name: "Dashboard", href: "/dashboard", iconName: "dashboard" },
    { name: "Pesanan", href: "/orders", iconName: "orders" },
    { name: "Dapur", href: "/kitchen", iconName: "kitchen" },
    { name: "Produk", href: "/products", iconName: "products" },
    { name: "Kategori", href: "/categories", iconName: "categories" },
    { name: "Promosi", href: "/promotions", iconName: "promotions" },
    { name: "Meja", href: "/tables", iconName: "tables" },
    { name: "Stok Admin", href: "/inventory", iconName: "inventory" },
    { name: "Laporan", href: "/reports", iconName: "reports" },
    { name: "Staf", href: "/users", iconName: "users" },
  ],
  WAREHOUSE: [
    { name: "Dashboard Gudang", href: "/warehouse/dashboard", iconName: "dashboard" },
    { name: "Stok Saat Ini", href: "/warehouse/current-stock", iconName: "inventory" },
    { name: "Stok Awal", href: "/warehouse/opening", iconName: "shifts" },
    { name: "Pengaturan Satuan", href: "/warehouse/settings/units", iconName: "categories" },
    { name: "Pengaturan Gudang", href: "/warehouse/settings/warehouses", iconName: "tables" },
  ],
  CASHIER: [
    { name: "Laci Kasir", href: "/shifts", iconName: "shifts" },
  ],
  KITCHEN: [
    { name: "Layar Dapur", href: "/kitchen", iconName: "kitchen" },
  ],
  ACCOUNTING: [
    { name: "Rincian Laporan", href: "/reports", iconName: "reports" },
  ],
};

// --- Helper Functions ---

export const getDefaultRouteByRole = (role: UserRole): string => {
  const defaultWorkspace = DEFAULT_WORKSPACE[role];
  return WORKSPACE_DEFAULT_ROUTES[defaultWorkspace] || "/login";
};

export const getActiveWorkspaceByPath = (path: string): WorkspaceType | null => {
  const sortedConfigs = [...ROUTES_CONFIG].sort((a, b) => b.path.length - a.path.length);
  const match = sortedConfigs.find((c) => path === c.path || path.startsWith(c.path + "/"));
  return match?.workspace || null;
};

export const isRouteAllowed = (role: UserRole, path: string): boolean => {
  const sortedConfigs = [...ROUTES_CONFIG].sort((a, b) => b.path.length - a.path.length);
  const match = sortedConfigs.find((c) => path === c.path || path.startsWith(c.path + "/"));

  if (!match) {
    return false;
  }

  // Common routes are always allowed for authenticated users
  if (!match.workspace) {
    return true;
  }

  const allowedWorkspaces = ROLE_WORKSPACES[role] || [];
  return allowedWorkspaces.includes(match.workspace);
};

export const handleWorkspaceRedirect = (role: UserRole, pathname: string): string | null => {
  const isGenericPath = pathname === "/" || pathname === "/dashboard";
  if (isGenericPath) {
    const allowedWorkspaces = ROLE_WORKSPACES[role] || [];
    if (allowedWorkspaces.includes("ADMIN")) {
      return "/dashboard";
    }
    const defaultWorkspace = DEFAULT_WORKSPACE[role];
    return WORKSPACE_DEFAULT_ROUTES[defaultWorkspace] || "/login";
  }
  return null;
};
