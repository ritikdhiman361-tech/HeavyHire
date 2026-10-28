import { PrismaClient } from "@prisma/client";

// One shared database client for the whole app.
// (Creating many clients would open too many database connections.)
export const prisma = new PrismaClient();
