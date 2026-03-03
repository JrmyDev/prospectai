import { spawnSync } from "node:child_process";

const schema = process.env.PRISMA_SCHEMA
  ? process.env.PRISMA_SCHEMA
  : process.env.VERCEL === "1"
    ? "prisma/schema.postgres.prisma"
    : "prisma/schema.prisma";

const bin = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(bin, ["prisma", "generate", "--schema", schema], {
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`[prisma] generated client using ${schema}`);
