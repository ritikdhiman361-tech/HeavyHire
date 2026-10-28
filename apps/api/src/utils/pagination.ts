import { paginationSchema } from "@heavyhire/shared";
import { parse } from "./validate";

/** Reads ?page=&limit= and returns what Prisma needs (skip/take). */
export function getPagination(query: unknown) {
  const { page, limit } = parse(paginationSchema, query);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}
