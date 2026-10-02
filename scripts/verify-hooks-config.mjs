import assert from "node:assert/strict";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { delimiter, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));
const stagedJavaScriptPattern = "{src,tests,scripts}/**/*.{js,jsx,mjs,cjs,ts,tsx}";
const stagedRootJavaScriptPattern = "./*.{js,jsx,mjs,cjs,ts,tsx}";
const stagedOtherPattern = "{src,tests,scripts}/**/*.{css,html,json,jsonc,svg,yaml,yml}";
const stagedRootOtherPattern = "./*.{css,html,json,jsonc,svg,yaml,yml}";
const expectedLintStaged = {
  [stagedJavaScriptPattern]: ["eslint --fix", "prettier --write"],
  [stagedRootJavaScriptPattern]: ["eslint --fix", "prettier --write"],
  [stagedOtherPattern]: "prettier --write",
  [stagedRootOtherPattern]: "prettier --write",
};

assert.equal(
  packageJson.scripts.prepare,
  "node scripts/prepare-hooks.mjs",
  "Install hooks only through the conditional prepare script.",
);
assert.equal(
  packageJson.scripts["verify:hooks"],
  "node scripts/verify-hooks-config.mjs",
  "The hooks verification must be runnable from the project root.",
);
assert.deepEqual(
  packageJson["lint-staged"],
  expectedLintStaged,
  "lint-staged must run ESLint then Prettier for source files and Prettier for other formatted files.",
);

const preCommitHook = await readFile(join(projectRoot, ".husky", "pre-commit"), "utf8");
assert.equal(
  preCommitHook.trim(),
  "pnpm exec lint-staged",
  "The pre-commit hook must delegate to lint-staged.",
);

const prepareHooksModule = await import("./prepare-hooks.mjs");
const temporaryRoot = await mkdtemp(join(tmpdir(), "inventory-hooks-"));

const run = (command, args, cwd, env = process.env) =>
  spawnSync(command, args, { cwd, env, encoding: "utf8" });

const runGit = (args, cwd) => {
  const result = run("git", args, cwd);
  assert.equal(
    result.error,
    undefined,
    `Git could not run: ${result.error?.message ?? "unknown error"}`,
  );
  assert.equal(result.status, 0, `git ${args.join(" ")} failed.\n${result.stdout}${result.stderr}`);
  return result;
};

try {
  const noGitRoot = join(temporaryRoot, "no-git");
  await mkdir(noGitRoot);
  const noGitMessages = [];
  const noGitResult = await prepareHooksModule.prepareHooks({
    projectRoot: noGitRoot,
    environment: { ...process.env, HUSKY: "1" },
    logger: {
      info: (message) => noGitMessages.push(message),
      error: (message) => noGitMessages.push(message),
    },
  });

  assert.equal(noGitResult.installed, false);
  assert.equal(noGitResult.reason, "no-git");
  assert.ok(
    noGitMessages.some((message) => /No Git repository/.test(message)),
    "The no-Git case must be reported without claiming the hook is active.",
  );
  await assert.rejects(access(join(noGitRoot, ".git")));

  const isolatedRepository = join(temporaryRoot, "git-repository");
  await mkdir(isolatedRepository);
  await mkdir(join(isolatedRepository, "scripts", "eslint-rules"), {
    recursive: true,
  });
  await mkdir(join(isolatedRepository, "src", "features", "products"), {
    recursive: true,
  });
  await mkdir(join(isolatedRepository, "tests"), { recursive: true });
  await mkdir(join(isolatedRepository, "scripts"), { recursive: true });

  await copyFile(
    join(projectRoot, "eslint.config.js"),
    join(isolatedRepository, "eslint.config.js"),
  );
  await copyFile(
    join(projectRoot, "scripts", "eslint-rules", "no-cross-feature-internal-imports.mjs"),
    join(isolatedRepository, "scripts", "eslint-rules", "no-cross-feature-internal-imports.mjs"),
  );
  await copyFile(
    join(projectRoot, ".prettierrc.json"),
    join(isolatedRepository, ".prettierrc.json"),
  );
  await copyFile(join(projectRoot, ".prettierignore"), join(isolatedRepository, ".prettierignore"));
  await symlink(
    join(projectRoot, "node_modules"),
    join(isolatedRepository, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await writeFile(
    join(isolatedRepository, "package.json"),
    `${JSON.stringify({ type: "module", "lint-staged": expectedLintStaged }, null, 2)}\n`,
  );

  runGit(["init", "--quiet"], isolatedRepository);
  runGit(["config", "user.name", "Inventory hooks verification"], isolatedRepository);
  runGit(["config", "user.email", "hooks-verification@example.invalid"], isolatedRepository);

  await mkdir(join(isolatedRepository, ".husky"));
  await copyFile(
    join(projectRoot, ".husky", "pre-commit"),
    join(isolatedRepository, ".husky", "pre-commit"),
  );

  const previousHuskyFlag = process.env.HUSKY;
  process.env.HUSKY = "1";
  let hookInstallResult;

  try {
    hookInstallResult = await prepareHooksModule.prepareHooks({
      projectRoot: isolatedRepository,
      environment: {
        ...process.env,
        CI: "",
        HUSKY: "1",
        NODE_ENV: "test",
      },
      logger: { info: () => {}, error: () => {} },
    });
  } finally {
    if (previousHuskyFlag === undefined) {
      delete process.env.HUSKY;
    } else {
      process.env.HUSKY = previousHuskyFlag;
    }
  }

  assert.equal(hookInstallResult.installed, true);
  assert.equal(
    runGit(["config", "--get", "core.hooksPath"], isolatedRepository).stdout.trim(),
    ".husky/_",
    "Husky must configure hooks only in the isolated repository.",
  );
  await access(join(isolatedRepository, ".husky", "_", "pre-commit"));

  const sourceFixture = join(
    isolatedRepository,
    "src",
    "features",
    "products",
    "staged-fixture.ts",
  );
  const jsonFixture = join(isolatedRepository, "src", "features", "products", "staged.json");
  const testFixture = join(isolatedRepository, "tests", "hooks-fixture.ts");
  const scriptFixture = join(isolatedRepository, "scripts", "hooks-fixture.mjs");
  const rootJavaScriptFixture = join(isolatedRepository, "staged-root.js");
  const rootJsonFixture = join(isolatedRepository, "staged-root.json");
  await writeFile(sourceFixture, "export const stagedFixture={value:1}\n");
  await writeFile(jsonFixture, '{"ready":true}\n');
  await writeFile(testFixture, "export const stagedTestFixture={value:2}\n");
  await writeFile(scriptFixture, "export const stagedScriptFixture={value:3}\n");
  await writeFile(rootJavaScriptFixture, "export const stagedRootFixture={value:4}\n");
  await writeFile(rootJsonFixture, '{"root":true}\n');
  runGit(
    [
      "add",
      "src/features/products/staged-fixture.ts",
      "src/features/products/staged.json",
      "tests/hooks-fixture.ts",
      "scripts/hooks-fixture.mjs",
      "staged-root.js",
      "staged-root.json",
    ],
    isolatedRepository,
  );

  const lintStagedCli = join(projectRoot, "node_modules", "lint-staged", "bin", "lint-staged.js");
  const environment = {
    ...process.env,
    PATH: [join(projectRoot, "node_modules", ".bin"), process.env.PATH ?? ""].join(delimiter),
  };
  const lintStagedResult = run(process.execPath, [lintStagedCli], isolatedRepository, environment);

  assert.equal(
    lintStagedResult.error,
    undefined,
    `lint-staged could not run: ${lintStagedResult.error?.message ?? "unknown error"}`,
  );
  assert.equal(
    lintStagedResult.status,
    0,
    `lint-staged failed in the isolated Git repository.\n${lintStagedResult.stdout}${lintStagedResult.stderr}`,
  );

  const formattedSource = await readFile(sourceFixture, "utf8");
  const formattedJson = await readFile(jsonFixture, "utf8");
  const formattedTest = await readFile(testFixture, "utf8");
  const formattedScript = await readFile(scriptFixture, "utf8");
  const formattedRootJavaScript = await readFile(rootJavaScriptFixture, "utf8");
  const formattedRootJson = await readFile(rootJsonFixture, "utf8");
  assert.equal(formattedSource, "export const stagedFixture = { value: 1 };\n");
  assert.equal(formattedJson, '{ "ready": true }\n');
  assert.equal(formattedTest, "export const stagedTestFixture = { value: 2 };\n");
  assert.equal(formattedScript, "export const stagedScriptFixture = { value: 3 };\n");
  assert.equal(formattedRootJavaScript, "export const stagedRootFixture = { value: 4 };\n");
  assert.equal(formattedRootJson, '{ "root": true }\n');

  const cachedSource = runGit(
    ["show", ":src/features/products/staged-fixture.ts"],
    isolatedRepository,
  );
  assert.equal(
    cachedSource.stdout,
    formattedSource,
    "lint-staged must stage formatter changes automatically.",
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

console.log(
  "Hooks verified: no-Git preparation is skipped/reported; lint-staged ran and staged ESLint/Prettier changes in an isolated Git repository.",
);
