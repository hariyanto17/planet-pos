import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
export const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkeyforretailposapp";
export const DATABASE_URL = process.env.DATABASE_URL || "";
export const SALT_ROUNDS = 10;
