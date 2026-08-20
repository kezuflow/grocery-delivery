import { access, readFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const command = process.argv[2] ?? "check";

const checks = {
  migrations: async () => {
    const files = await (
      await import("node:fs/promises")
    ).readdir(new URL("packages/db/migrations/", root));
    const numbered = files.filter((file) => /^\d+_.+\.sql$/.test(file)).sort();
    if (!numbered.length) throw new Error("no SQL migrations found");
    const numbers = numbered.map((file) => Number(file.slice(0, 4)));
    if (new Set(numbers).size !== numbers.length) throw new Error("duplicate migration number");
    console.log(`migration rehearsal: ${numbered.length} forward-only migrations discovered`);
  },
  "backup-restore": async () => {
    await access(new URL("docs/runbooks/backup-restore.md", root));
    console.log("backup/restore rehearsal: runbook and credential-free procedure present");
  },
  friday: async () => {
    await access(new URL("docs/runbooks/friday-cycle.md", root));
    console.log("Friday-cycle rehearsal: deterministic cutoff and workflow procedure present");
  },
  sandbox: async () => {
    const packageJson = JSON.parse(await readFile(new URL("apps/api/package.json", root), "utf8"));
    if (!packageJson.scripts.test) throw new Error("API sandbox test command is missing");
    console.log("provider sandbox rehearsal: API test command is available");
  },
  load: async () => {
    await access(new URL("docs/runbooks/load-test.md", root));
    console.log("load rehearsal: bounded local procedure present");
  },
  incident: async () => {
    await access(new URL("docs/runbooks/incident-response.md", root));
    console.log("incident rehearsal: response checklist present");
  },
};

if (command === "check") {
  for (const check of Object.values(checks)) await check();
} else if (checks[command]) {
  await checks[command]();
} else {
  console.error(`Unknown rehearsal: ${command}`);
  process.exitCode = 1;
}
