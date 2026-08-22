import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "AGENTS.md",
  "apps/web/AGENTS.md",
  "CONTRIBUTING.md",
  "docs/project-guidance.md",
  "docs/implementation-backlog.md",
  "docs/frontend-backend-audit.md",
  "docs/frontend-standards.md",
  "docs/architecture/production-plan.md",
];

const failures = [];
for (const relativePath of requiredFiles) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required guidance file: ${relativePath}`);
    continue;
  }
  if (statSync(absolutePath).size === 0) {
    failures.push(`Empty required guidance file: ${relativePath}`);
  }
}

for (const relativePath of requiredFiles.filter((path) => path.endsWith(".md"))) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) continue;
  const content = readFileSync(absolutePath, "utf8");
  if (/\[TODO|TODO:/i.test(content)) {
    failures.push(`Unfinished guidance placeholder: ${relativePath}`);
  }
}

const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
if (
  !agents.includes("docs/project-guidance.md") ||
  !agents.includes("Local development is the default")
) {
  failures.push(
    "AGENTS.md must route to project guidance and define local development as the default",
  );
}

const guidance = readFileSync(join(root, "docs/project-guidance.md"), "utf8");
if (!guidance.includes("Do not deploy Workers") || !guidance.includes("explicitly asks")) {
  failures.push("Project guidance must require explicit user authorization for remote actions");
}

const backlog = readFileSync(join(root, "docs/implementation-backlog.md"), "utf8");
if (!backlog.includes("docs/project-guidance.md")) {
  failures.push("The canonical backlog must link the project guidance");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Project guidance check passed (${requiredFiles.length} required files)`);
}
