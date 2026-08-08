import { UserRole } from "@shared/types";

export type WorkspaceType = "ADMIN" | "WAREHOUSE" | "ACCOUNTING";

// Permission Matrix mapping UserRole -> Workspaces they can access
export const ROLE_WORKSPACES: Record<UserRole, WorkspaceType[]> = {
  ADMIN: ["ADMIN", "WAREHOUSE", "ACCOUNTING"],
  WAREHOUSE: ["WAREHOUSE"],
  CASHIER: [],
  KITCHEN: [],
  ACCOUNTING: ["ACCOUNTING"],
};

// Default Workspace for each role when landing or accessing generic routes
export const DEFAULT_WORKSPACE: Record<UserRole, WorkspaceType> = {
  ADMIN: "ADMIN",
  WAREHOUSE: "WAREHOUSE",
  CASHIER: "WAREHOUSE", // Fallback to warehouse if cashier logs in to web
  KITCHEN: "WAREHOUSE",   // Fallback to warehouse if kitchen logs in to web
  ACCOUNTING: "ACCOUNTING",
};

// Default route for each workspace
export const WORKSPACE_DEFAULT_ROUTES: Record<WorkspaceType, string> = {
  ADMIN: "/dashboard",
  WAREHOUSE: "/warehouse/dashboard",
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
  { path: "/warehouse/settings/units", workspace: "ADMIN" },
  { path: "/warehouse/settings/warehouses", workspace: "ADMIN" },

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
    { name: "Produk", href: "/products", iconName: "products" },
    { name: "Kategori", href: "/categories", iconName: "categories" },
    { name: "Promosi", href: "/promotions", iconName: "promotions" },
    { name: "Meja", href: "/tables", iconName: "tables" },
    { name: "Stok Admin", href: "/inventory", iconName: "inventory" },
    { name: "Laporan", href: "/reports", iconName: "reports" },
    { name: "Staf", href: "/users", iconName: "users" },
    { name: "Units", href: "/warehouse/settings/units", iconName: "ruler" },
    { name: "Pengaturan Gudang", href: "/warehouse/settings/warehouses", iconName: "tables" },
  ],
  WAREHOUSE: [
    { name: "Dashboard Gudang", href: "/warehouse/dashboard", iconName: "dashboard" },
    { name: "Stok Saat Ini", href: "/warehouse/current-stock", iconName: "inventory" },
    { name: "Stok Awal", href: "/warehouse/opening", iconName: "shifts" },
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
