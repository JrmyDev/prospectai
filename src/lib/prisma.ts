
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

// Assure que globalThis.prisma existe
declare global {
	var prisma: PrismaClient | undefined;
}
globalThis.prisma = globalThis.prisma ?? undefined;

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

export const prisma: PrismaClient =
	globalThis.prisma ??
	new PrismaClient({
		adapter,
	});

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
