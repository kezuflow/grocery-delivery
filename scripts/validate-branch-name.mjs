#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const branch =
  process.argv[2] || execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
const allowed =
  /^(main|develop|(feat|fix|docs|refactor|test|build|ci|chore|perf|hotfix|release)\/[a-z0-9]+(?:-[a-z0-9]+)*)$/;

if (!allowed.test(branch)) {
  console.error(`Invalid branch name: ${branch || "<detached HEAD>"}`);
  console.error(
    "Use <type>/<short-kebab-case-description>, for example feat/subscription-checkout.",
  );
  process.exit(1);
}

console.log(`Valid branch name: ${branch}`);
