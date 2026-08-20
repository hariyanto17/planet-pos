import { UserRole } from "@shared/types";

export interface AuthState {
  token: string | null;
  user: {
    id: string;
    fullName: string;
    username: string;
    role: UserRole;
    warehouseId?: string | null;
  } | null;
}
