import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        fullName: string;
        username: string;
        role: UserRole;
        warehouseId?: string | null;
      };
      cashierShift?: any;
    }
  }
}
