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

    req.user = decoded;
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
      req.user = decoded;
    }
    next();
  } catch (error) {
    next();
  }
};

export const requireRoles = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("UNAUTHORIZED", "Not authenticated"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError("FORBIDDEN", "Access denied for this role"));
    }
    next();
  };
};
