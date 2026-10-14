import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import { loadEnv } from "vite";

import { toolEnvSchema } from "../src/shared/config/env.schema.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const snapshotOpenApi = async ({ outputFile, paths: selectedPaths, scope }) => {
  const outputPath = resolve(projectRoot, outputFile);
  const fileEnvironment = loadEnv("development", projectRoot, ["API_PROXY_TARGET"]);
  const { API_PROXY_TARGET } = toolEnvSchema.parse({
    API_PROXY_TARGET: process.env.API_PROXY_TARGET ?? fileEnvironment.API_PROXY_TARGET,
  });
  const openApiUrl = new URL("/openapi.json", API_PROXY_TARGET);
  const response = await fetch(openApiUrl, { signal: AbortSignal.timeout(10_000) });

  if (!response.ok) {
    throw new Error(`OpenAPI endpoint returned HTTP ${response.status}.`);
  }

  const openApiDocument = await response.json();

  if (
    typeof openApiDocument.openapi !== "string" ||
    typeof openApiDocument.info?.title !== "string" ||
    typeof openApiDocument.info?.version !== "string" ||
    typeof openApiDocument.paths !== "object" ||
    openApiDocument.paths === null ||
    typeof openApiDocument.components !== "object" ||
    openApiDocument.components === null
  ) {
    throw new Error("OpenAPI endpoint returned an incomplete document.");
  }

  const selectedPathEntries = selectedPaths.map((path) => {
    const operation = openApiDocument.paths[path];

    if (!operation) {
      throw new Error(`OpenAPI document is missing the required path ${path}.`);
    }

    return [path, operation];
  });
  const selectedPathDocument = Object.fromEntries(selectedPathEntries);
  const selectedComponents = {};
  const referencesToResolve = [];

  const collectReferences = (value) => {
    if (Array.isArray(value)) {
      value.forEach(collectReferences);
      return;
    }

    if (typeof value !== "object" || value === null) {
      return;
    }

    if (typeof value.$ref === "string") {
      const pointer = value.$ref;

      if (!pointer.startsWith("#/components/")) {
        throw new Error("OpenAPI snapshot cannot resolve a reference outside components.");
      }

      const [section, encodedName] = pointer.slice("#/components/".length).split("/");
      const name = encodedName?.replaceAll("~1", "/").replaceAll("~0", "~");

      if (!section || !name) {
        throw new Error("OpenAPI snapshot encountered an invalid component reference.");
      }

      referencesToResolve.push({ section, name });
    }

    Object.values(value).forEach(collectReferences);
  };

  collectReferences(selectedPathDocument);

  for (const [name, scheme] of Object.entries(openApiDocument.components.securitySchemes ?? {})) {
    if (scheme.type === "apiKey" && scheme.in === "cookie") {
      selectedComponents.securitySchemes ??= {};
      selectedComponents.securitySchemes[name] = scheme;
    }
  }

  while (referencesToResolve.length > 0) {
    const { section, name } = referencesToResolve.pop();
    const component = openApiDocument.components[section]?.[name];

    if (component === undefined) {
      throw new Error(`OpenAPI reference to missing component ${section}/${name}.`);
    }

    selectedComponents[section] ??= {};

    if (selectedComponents[section][name] !== undefined) {
      continue;
    }

    selectedComponents[section][name] = component;
    collectReferences(component);
  }

  const snapshot = {
    openapi: openApiDocument.openapi,
    info: {
      title: openApiDocument.info.title,
      version: openApiDocument.info.version,
    },
    paths: selectedPathDocument,
    components: selectedComponents,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  const prettierOptions = await resolveConfig(outputPath);
  const formattedSnapshot = await format(`${JSON.stringify(snapshot, null, 2)}\n`, {
    ...prettierOptions,
    filepath: outputPath,
  });
  await writeFile(outputPath, formattedSnapshot, "utf8");

  const schemaCount = Object.keys(selectedComponents.schemas ?? {}).length;
  console.log(
    `OpenAPI ${snapshot.openapi}: saved ${selectedPaths.length} ${scope} paths and ${schemaCount} referenced schemas to ${outputFile}.`,
  );
};
