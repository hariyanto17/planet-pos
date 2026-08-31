import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { JWT_SECRET, SALT_ROUNDS } from "../../config/constant";
import { LoginInput, LoginResult } from "./interface";

export const login = async (input: LoginInput): Promise<LoginResult> => {
  const rawUsername = (input.username || "").trim();
  let user = await prisma.user.findUnique({
    where: { username: rawUsername },
  });

  if (!user && rawUsername.includes(".")) {
    user = await prisma.user.findUnique({
      where: { username: rawUsername.replace(/\./g, "_") },
    });
  }

  if (!user && rawUsername.includes("_")) {
    user = await prisma.user.findUnique({
      where: { username: rawUsername.replace(/_/g, ".") },
    });
  }

  if (!user && rawUsername.includes("@")) {
    const fromEmail = rawUsername.split("@")[0];
    user =
      (await prisma.user.findUnique({ where: { username: fromEmail } })) ||
      (await prisma.user.findUnique({ where: { username: fromEmail.replace(/\./g, "_") } }));
  }

  if (!user) {
    throw new AppError("UNAUTHORIZED", "Invalid username");
  }

  if (!user.isActive) {
    throw new AppError("UNAUTHORIZED", "Account is not active");
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError("UNAUTHORIZED", "Invalid password");
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
    },
  };
};

export const changePassword = async (userId: string, input: any) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("UNAUTHORIZED", "User not found");
  }

  const isPasswordValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError("BAD_REQUEST", "Current password is incorrect.");
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });
};

export const ssoLogin = async (code: string): Promise<LoginResult> => {
  const platformApiUrl = process.env.PLATFORM_API_URL || process.env.PLATFORM_URL || "http://localhost:4000";
  
  const platformRes = await fetch(`${platformApiUrl}/api/applications/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, application: "CONCESSION" }),
  });

  if (!platformRes.ok) {
    throw new AppError("UNAUTHORIZED", "SSO verification failed with Platform");
  }

  const envelope = await platformRes.json() as any;
  const platformUser = envelope.data;

  let user = await prisma.user.findUnique({
    where: { platformUserId: platformUser.id },
  });

  const localRole = platformUser.application.role === "CONCESSION_ADMINISTRATOR" ? "ADMIN" : "CASHIER";

  const baseUsername = (platformUser.email || "").split("@")[0];
  if (!user && baseUsername) {
    user = (await prisma.user.findUnique({ where: { username: baseUsername } }))
      || (await prisma.user.findUnique({ where: { username: baseUsername.replace(".", "_") } }));
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { platformUserId: platformUser.id },
      });
    }
  }

  if (!user) {
    let username = baseUsername || `user_${platformUser.id.substring(0, 6)}`;
    let suffix = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${suffix}`;
      suffix++;
    }

    user = await prisma.user.create({
      data: {
        platformUserId: platformUser.id,
        fullName: platformUser.name,
        username,
        passwordHash: "sso-managed-credentials",
        role: localRole,
        isActive: true,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: platformUser.name,
        role: localRole,
      },
    });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
    },
  };
};
