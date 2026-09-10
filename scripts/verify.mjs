import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const configPath = ts.findConfigFile(".", ts.sys.fileExists, "tsconfig.json");
assert(configPath, "tsconfig.json is required");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ".");
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  }));
  process.exitCode = 1;
} else {
  console.log("TypeScript: no diagnostics.");
}

const read = (file) => readFileSync(file, "utf8");
const systems = read("src/data/systems.ts");
for (const id of ["overnetting", "shkolodrive", "over-adapter", "cislog"]) {
  assert(systems.includes(`id: "${id}"`), `Missing project ${id}`);
  assert(systems.includes(`href: "/systems/${id}"`), `Missing route ${id}`);
}

const contacts = read("src/data/contacts.ts");
for (const destination of ["https://t.me/over_adpt", "https://t.me/overnetting_bot", "https://t.me/+OI5UGXchMRg1NDY6", "https://t.me/ShkoloDrive", "https://t.me/cislog", "https://t.me/New_Over", "https://t.me/cisinter_4"]) {
  assert(contacts.includes(destination), `Missing public destination ${destination}`);
}

const methodology = read("src/data/methodology.ts");
for (const id of ["input", "extraction", "correlation", "validation", "evidence"]) assert(methodology.includes(`id: "${id}"`));
for (const state of ["LOW", "MED", "HIGH", "CONFIRMED"]) assert(methodology.includes(`label: "${state}"`));

function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(join(path, entry.name)) : [join(path, entry.name)]);
}
for (const file of [...files("src/components"), ...files("src/pages"), ...files("src/data")].filter((file) => /\.(ts|tsx)$/.test(file))) {
  assert(!/CLEARANCE REQUIRED|Access level|REQUEST ACCESS|Contact operator|OVER-771X|"LIMITED"/i.test(read(file)), `Old access copy in ${file}`);
}
assert(!read("index.html").includes("unsafe-eval"));
assert(read("src/lib/router.tsx").includes('path === "/access"'));
console.log("Content: four projects, seven controlled destinations, five methodology stages, four confidence states, and no old access UI.");
console.log("Browser, artwork-original, deployment-header, and dependency-audit checks remain separate.");