import { mkdir, writeFile } from "node:fs/promises";
import { format } from "prettier";
const { openApiDocument } = await import("../packages/contracts/src/openapi.ts");

await mkdir("docs", { recursive: true });
const output = await format(JSON.stringify(openApiDocument), { parser: "json" });
await writeFile("docs/openapi.json", output, "utf8");
console.log("Generated docs/openapi.json");
