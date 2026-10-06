import { spawnSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultProjectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const isSamePath = (left, right) =>
  relative(resolve(left), resolve(right)) === "" && relative(resolve(right), resolve(left)) === "";

const logMessage = (logger, level, message) => {
  const log = logger[level] ?? logger.info;
  log.call(logger, `[hooks] ${message}`);
};

export const prepareHooks = async ({
  projectRoot = defaultProjectRoot,
  environment = process.env,
  logger = console,
} = {}) => {
  const root = resolve(projectRoot);
  const gitRootResult = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: root,
    env: environment,
    encoding: "utf8",
  });

  if (gitRootResult.error || gitRootResult.status !== 0) {
    const reason = gitRootResult.error ? "Git is unavailable" : "No Git repository";
    const message = `${reason} at ${root}; Husky hooks were not installed.`;
    logMessage(logger, "info", message);
    return { installed: false, reason: "no-git", message };
  }

  const gitRoot = resolve(gitRootResult.stdout.trim());

  if (!isSamePath(gitRoot, root)) {
    const message = `Git root ${gitRoot} differs from package root ${root}; Husky hooks were not installed.`;
    logMessage(logger, "info", message);
    return { installed: false, reason: "different-root", message };
  }

  if (
    environment.HUSKY === "0" ||
    environment.CI === "true" ||
    environment.NODE_ENV === "production"
  ) {
    const message = "Husky installation skipped by environment; hooks were not installed.";
    logMessage(logger, "info", message);
    return { installed: false, reason: "environment", message };
  }

  const hooksPathResult = spawnSync("git", ["config", "--get", "core.hooksPath"], {
    cwd: root,
    env: environment,
    encoding: "utf8",
  });

  if (hooksPathResult.error || ![0, 1].includes(hooksPathResult.status)) {
    const message = `Could not inspect Git core.hooksPath; Husky hooks were not installed.${hooksPathResult.stderr ? ` ${hooksPathResult.stderr.trim()}` : ""}`;
    logMessage(logger, "error", message);
    return { installed: false, reason: "git-config-error", message };
  }

  const configuredHooksPath = hooksPathResult.stdout.trim();
  const huskyHooksPath = resolve(root, ".husky", "_");

  if (
    hooksPathResult.status === 0 &&
    configuredHooksPath &&
    !isSamePath(resolve(root, configuredHooksPath), huskyHooksPath)
  ) {
    const message = `Git core.hooksPath is already set to ${configuredHooksPath}; it was left unchanged and Husky was not installed.`;
    logMessage(logger, "info", message);
    return { installed: false, reason: "custom-hooks-path", message };
  }

  const previousWorkingDirectory = process.cwd();

  try {
    process.chdir(root);
    const { default: husky } = await import("husky");
    const installMessage = husky();

    if (installMessage) {
      logMessage(logger, "error", installMessage);
      return {
        installed: false,
        reason: "install-error",
        message: installMessage,
      };
    }

    const message = `Husky hooks installed for ${root}.`;
    logMessage(logger, "info", message);
    return { installed: true, reason: "installed", message };
  } catch (error) {
    const message = `Could not install Husky hooks: ${error.message}`;
    logMessage(logger, "error", message);
    return { installed: false, reason: "install-error", message };
  } finally {
    process.chdir(previousWorkingDirectory);
  }
};

const invokedScript = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;

if (invokedScript === import.meta.url) {
  const result = await prepareHooks();
  if (!result.installed && ["install-error", "git-config-error"].includes(result.reason)) {
    process.exitCode = 1;
  }
}
