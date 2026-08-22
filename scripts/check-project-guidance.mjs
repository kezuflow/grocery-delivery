import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const skillRoot = ".codex/skills/carbon-vertical-slice";
const references = [
  "backend-engineering.md",
  "cross-cutting-governance.md",
  "database-engineering.md",
  "devops-deployment.md",
  "domain-knowledge.md",
  "frontend-engineering.md",
  "observability.md",
  "performance.md",
  "refactoring.md",
  "repo-navigation.md",
  "security.md",
  "system-design.md",
  "testing-debugging.md",
];
const requiredFiles = [
  "AGENTS.md",
  "CONTRIBUTING.md",
  "docs/project-guidance.md",
  "docs/implementation-backlog.md",
  "docs/frontend-backend-audit.md",
  "docs/frontend-standards.md",
  "docs/architecture/production-plan.md",
  "docs/architecture/vertical-slice-system-design.docx",
  `${skillRoot}/SKILL.md`,
  `${skillRoot}/agents/openai.yaml`,
  ...references.map((name) => `${skillRoot}/references/${name}`),
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

const skillPath = join(root, skillRoot, "SKILL.md");
const skill = existsSync(skillPath) ? readFileSync(skillPath, "utf8") : "";
for (const reference of references) {
  if (!skill.includes(`references/${reference}`)) {
    failures.push(`Skill does not route to reference: ${reference}`);
  }
}

const textFiles = requiredFiles.filter((path) => path.endsWith(".md") || path.endsWith(".yaml"));
for (const relativePath of textFiles) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) continue;
  const content = readFileSync(absolutePath, "utf8");
  if (/\[TODO|TODO:/i.test(content)) {
    failures.push(`Unfinished guidance placeholder: ${relativePath}`);
  }
}

const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
if (!agents.includes("docs/project-guidance.md") || !agents.includes(`${skillRoot}/SKILL.md`)) {
  failures.push("AGENTS.md must route contributors to the guidance index and repository skill");
}

const backlog = readFileSync(join(root, "docs/implementation-backlog.md"), "utf8");
if (!backlog.includes("docs/project-guidance.md") || !backlog.includes(`${skillRoot}/SKILL.md`)) {
  failures.push("The canonical backlog must link the guidance index and repository skill");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Project guidance check passed (${requiredFiles.length} required files)`);
}
