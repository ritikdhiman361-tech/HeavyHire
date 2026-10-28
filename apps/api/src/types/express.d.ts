import type { User, Vendor } from "@prisma/client";

// Lets TypeScript know about the values our auth middleware adds to `req`.
declare global {
  namespace Express {
    interface Request {
      user?: User;
      vendor?: Vendor;
    }
  }
}

export {};
