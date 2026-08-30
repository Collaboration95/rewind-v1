import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const sourceRoot = new URL("../src/", import.meta.url);
const sourceFiles = collectTypeScriptFiles(sourceRoot);
const source = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");
const imports = [...source.matchAll(/\b(?:from|import)\s*['"][^'"]+['"]/g)]
  .map(([statement]) => statement)
  .join("\n");

test("domain source stays independent of UI, persistence, and vendor modules", () => {
  assert.ok(sourceFiles.length > 0);
  assert.doesNotMatch(
    imports,
    /react-native|\breact\b|\bexpo\b|sqlite|aws|cognito|terraform/i,
  );
  assert.doesNotMatch(source, /https?:\/\//i);
});

function collectTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryUrl = new URL(
      `${entry.name}${entry.isDirectory() ? "/" : ""}`,
      directory,
    );
    return entry.isDirectory()
      ? collectTypeScriptFiles(entryUrl)
      : entry.name.endsWith(".ts")
        ? [entryUrl]
        : [];
  });
}
