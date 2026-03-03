
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "path";

// Assure que globalThis.prisma existe
declare global {
	var prisma: PrismaClient | undefined;
}
globalThis.prisma = globalThis.prisma ?? undefined;

function createPrismaClient() {
	if (process.env.VERCEL === "1") {
		const connectionString = process.env.DATABASE_URL;
		if (!connectionString) {
			throw new Error("DATABASE_URL is required when running on Vercel.");
		}

		const adapter = new PrismaPg({ connectionString });
		return new PrismaClient({ adapter });
	}

	const dbPath = path.join(process.cwd(), "dev.db");
	const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
	return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
	globalThis.prisma ??
	createPrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
