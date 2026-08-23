import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7은 driver adapter 없이 `new PrismaClient()`로 동작하지 않는다.
// DATABASE_URL은 Supabase pooler(6543) — 런타임 쿼리는 여기로 나간다.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
