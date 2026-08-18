#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const mode = process.argv[2];
const value = process.argv[3];
if (!mode || !value || !["--commit", "--file"].includes(mode)) {
  console.error("Usage: node scripts/validate-commit-message.mjs --commit <commit-ref>");
  console.error("   or: node scripts/validate-commit-message.mjs --file <commit-message-file>");
  process.exit(2);
}

const message = (
  mode === "--commit"
    ? execFileSync("git", ["log", "-1", "--pretty=%B", value], { encoding: "utf8" })
    : readFileSync(value, "utf8")
).replace(/\r\n/g, "\n");

const firstLine = message.split("\n")[0].trim();
const conventionalCommit =
  /^(feat|fix|docs|refactor|test|build|ci|chore|perf|revert)\([a-z0-9]+(?:-[a-z0-9]+)*\)!?: \S(?:.*\S)?$/;
const errors = [];
if (!firstLine) errors.push("the subject is empty");
else if (!conventionalCommit.test(firstLine))
  errors.push(
    "use <type>(<scope>): <imperative summary>; scope is required and must be kebab-case",
  );
if (firstLine.length > 72)
  errors.push(`the subject is ${firstLine.length} characters; maximum is 72`);
if (/[.!]$/.test(firstLine)) errors.push("the subject must not end with punctuation");
if (errors.length) {
  console.error(`Invalid commit message: ${firstLine || "<empty>"}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Valid commit message: ${firstLine}`);
