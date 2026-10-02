import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));

const getTargets = (script, mode) => {
  const command = script.split(" && ")[0];
  const prefix = `prettier --${mode} `;

  assert.ok(command.startsWith(prefix), `Expected a Prettier --${mode} command, got: ${command}`);

  const targetArguments = command.slice(prefix.length);
  const targets = [...targetArguments.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

  assert.ok(targets.length > 0, "Prettier scripts must declare file globs.");
  assert.equal(
    targets.map((target) => `"${target}"`).join(" "),
    targetArguments,
    "Every Prettier target glob must be quoted for cross-platform CLI expansion.",
  );

  return targets;
};

const formatTargets = getTargets(packageJson.scripts.format, "write");
const checkTargets = getTargets(packageJson.scripts["format:check"], "check");

assert.deepEqual(
  checkTargets,
  formatTargets,
  "format and format:check must operate on identical file globs.",
);
assert.ok(
  formatTargets.some((target) => target.startsWith("scripts/**/*")),
  "The formatting scope must include its isolated verification fixture directory.",
);
assert.equal(
  packageJson.scripts["format:check"].split(" && ")[1],
  "node scripts/verify-prettier-config.mjs",
  "format:check must run the isolated Prettier behavior verification.",
);

const ignoreFile = await readFile(join(projectRoot, ".prettierignore"), "utf8");
for (const ignoredPath of [
  "node_modules/",
  "dist/",
  "coverage/",
  ".vite/",
  "pnpm-lock.yaml",
  "src/shared/api/generated/",
  ".opencode/",
  "docs/",
  "specs/",
]) {
  assert.ok(ignoreFile.includes(ignoredPath), `Prettier must ignore ${ignoredPath}.`);
}

const prettierCli = join(projectRoot, "node_modules", "prettier", "bin", "prettier.cjs");
const temporaryDirectory = await mkdtemp(join(projectRoot, "scripts", "prettier-fixture-"));
const fixturePath = join(temporaryDirectory, "format-fixture.ts");
const fixtureRelativePath = relative(projectRoot, fixturePath);
const unformattedSource = "export const fixture={answer:42}\n";

const runPrettier = (...args) => {
  const result = spawnSync(process.execPath, [prettierCli, ...args, fixturePath], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  assert.equal(
    result.error,
    undefined,
    `Prettier CLI could not run: ${result.error?.message ?? "unknown error"}`,
  );

  return result;
};

try {
  await writeFile(fixturePath, unformattedSource, "utf8");

  const checkBeforeFormat = runPrettier("--check");
  assert.equal(
    checkBeforeFormat.status,
    1,
    `Prettier --check must reject the unformatted fixture.\n${checkBeforeFormat.stdout}${checkBeforeFormat.stderr}`,
  );
  assert.equal(
    await readFile(fixturePath, "utf8"),
    unformattedSource,
    "Prettier --check must not modify the fixture.",
  );

  const writeResult = runPrettier("--write");
  assert.equal(
    writeResult.status,
    0,
    `Prettier --write must format the fixture.\n${writeResult.stdout}${writeResult.stderr}`,
  );

  const formattedSource = await readFile(fixturePath, "utf8");
  assert.notEqual(
    formattedSource,
    unformattedSource,
    "Prettier --write must update the fixture on disk.",
  );

  const checkAfterFormat = runPrettier("--check");
  assert.equal(
    checkAfterFormat.status,
    0,
    `Prettier --check must accept the formatted fixture.\n${checkAfterFormat.stdout}${checkAfterFormat.stderr}`,
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log(
  `Prettier verified: matching globs (${formatTargets.length}), ignored artifacts preserved, and check/write/check fixture passed (${fixtureRelativePath}).`,
);
