import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/errorHandler";
import { JWT_SECRET } from "../config/constant";
import { UserRole } from "@prisma/client";
import { prisma } from "../utils/prisma";

interface JwtPayload {
  id: string;
  username: string;
  role: UserRole;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("UNAUTHORIZED", "Missing or invalid token"));
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Verify user still exists in database (especially after db reset/seeding)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    if (!user || !user.isActive) {
      return next(new AppError("UNAUTHORIZED", "User no longer exists or is inactive"));
    }

    // Platform Session Revalidation
    if (user.platformUserId) {
      try {
        const platformApiUrl = process.env.PLATFORM_API_URL || process.env.PLATFORM_URL || "http://localhost:4000";
        const apiKey = process.env.PLATFORM_INTERNAL_API_KEY || "platform-internal-secret-key-123";
        
        const platformRes = await fetch(
          `${platformApiUrl}/api/applications/users/${user.platformUserId}/context?application=CONCESSION`,
          {
            headers: {
              "x-platform-internal-key": apiKey,
            },
            signal: AbortSignal.timeout(2000),
          }
        );

        if (platformRes.status === 401 || platformRes.status === 403) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isActive: false },
          });
          return next(new AppError("UNAUTHORIZED", "Your access to this application is no longer available."));
        } else if (platformRes.status === 404) {
          return next(new AppError("UNAUTHORIZED", "User no longer exists on Platform"));
        } else if (platformRes.status >= 500) {
          return next(new AppError("SERVICE_UNAVAILABLE", "Platform identity verification server error"));
        } else if (platformRes.ok) {
          const envelope = await platformRes.json() as any;
          const platformContext = envelope.data;
          
          if (platformContext.status !== "ACTIVE") {
            await prisma.user.update({
              where: { id: user.id },
              data: { isActive: false },
            });
            return next(new AppError("UNAUTHORIZED", "Your account is disabled on Platform"));
          }

          // Strict Role Validation
          const roleCode = platformContext.application.role;
          if (roleCode !== "CONCESSION_ADMINISTRATOR" && roleCode !== "CONCESSION_CASHIER") {
            return next(new AppError("FORBIDDEN", "Access denied: invalid role configuration"));
          }

          // Sync role changes if any
          const localRole = roleCode === "CONCESSION_ADMINISTRATOR" ? "ADMIN" : "CASHIER";
          if (user.role !== localRole) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: localRole },
            });
            user.role = localRole;
          }
        } else {
          return next(new AppError("SERVICE_UNAVAILABLE", "Platform identity verification failed"));
        }
      } catch (err) {
        console.error("Platform revalidation temporarily unavailable", err);
        return next(new AppError("SERVICE_UNAVAILABLE", "Platform identity verification service is unavailable"));
      }
    }

    req.user = {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      warehouseId: user.warehouseId,
    };
    next();
  } catch (error) {
    return next(new AppError("UNAUTHORIZED", "Token validation failed"));
  }
};

export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    if (user && user.isActive) {
      req.user = {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        warehouseId: user.warehouseId,
      };
    }
    next();
  } catch (error) {
    next();
  }
};

import { getSettings } from "../modules/settings/service";

export const requireRoles = (roles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("UNAUTHORIZED", "Not authenticated"));
    }
    if (roles.includes(req.user.role)) {
      return next();
    }
    try {
      const settings = await getSettings();
      if (
        settings.appType === "CASHIER_ONLY" &&
        roles.includes("KITCHEN") &&
        req.user.role === "CASHIER"
      ) {
        return next();
      }
    } catch (e) {
      // settings check failed, fallback to normal check
    }
    return next(new AppError("FORBIDDEN", "Access denied for this role"));
  };
};

