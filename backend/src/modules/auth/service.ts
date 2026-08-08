import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { JWT_SECRET, SALT_ROUNDS } from "../../config/constant";
import { LoginInput, LoginResult } from "./interface";

export const login = async (input: LoginInput): Promise<LoginResult> => {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
  });

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
