import { mkdir, writeFile } from "node:fs/promises";
const { openApiDocument } = await import("../packages/contracts/src/openapi.ts");

await mkdir("docs", { recursive: true });
await writeFile("docs/openapi.json", `${JSON.stringify(openApiDocument, null, 2)}\n`, "utf8");
console.log("Generated docs/openapi.json");
