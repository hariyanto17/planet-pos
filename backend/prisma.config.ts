import { defineConfig } from "@prisma/config";
import env from "dotenv"

env.config()

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || "",
  },
});
