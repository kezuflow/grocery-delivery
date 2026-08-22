import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const packageStore = join(process.cwd(), "node_modules", ".pnpm");
const entry = readdirSync(packageStore)
  .filter((name) => name.startsWith("vite-node@"))
  .map((name) => join(packageStore, name, "node_modules", "vite-node", "vite-node.mjs"))
  .find((path) => existsSync(path));

if (!entry) {
  throw new Error("vite-node is not installed in the pnpm workspace store");
}

const result = spawnSync(process.execPath, [entry, "--script", ...process.argv.slice(2)], {
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
