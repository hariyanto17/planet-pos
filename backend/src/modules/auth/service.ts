import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { JWT_SECRET } from "../../config/constant";
import { LoginInput, LoginResult } from "./interface";

export const login = async (input: LoginInput): Promise<LoginResult> => {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
  });

  if (!user || !user.isActive) {
    throw new AppError("UNAUTHORIZED", "Invalid username or password");
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError("UNAUTHORIZED", "Invalid username or password");
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
