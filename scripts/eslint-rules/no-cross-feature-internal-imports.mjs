import path from "node:path";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const featuresRoot = resolve(projectRoot, "src/features");
const supportedExtensions = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);

const getFeature = (filePath) => {
  const relativePath = path.relative(featuresRoot, resolve(filePath));

  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    return null;
  }

  const [name] = relativePath.split(path.sep);

  if (!name) {
    return null;
  }

  return {
    name,
    root: resolve(featuresRoot, name),
  };
};

const getSpecifier = (node) => {
  if (!node) {
    return null;
  }

  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? null;
  }

  return null;
};

const resolveFeatureImport = (specifier, importerPath) => {
  if (specifier.startsWith("@/features/")) {
    return resolve(featuresRoot, specifier.slice("@/features/".length));
  }

  if (specifier.startsWith(".")) {
    return resolve(dirname(importerPath), specifier);
  }

  return null;
};

const isPublicEntry = (featureRoot, targetPath) => {
  const relativeTarget = path.relative(featureRoot, targetPath);

  if (relativeTarget === "") {
    return true;
  }

  if (
    relativeTarget === ".." ||
    relativeTarget.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeTarget)
  ) {
    return false;
  }

  const segments = relativeTarget.split(path.sep);

  if (segments.length !== 1) {
    return false;
  }

  const entry = path.parse(segments[0]);
  return entry.name === "index" && (entry.ext === "" || supportedExtensions.has(entry.ext));
};

const getImportNodes = (node) => {
  if (node.type === "ImportDeclaration" || node.type === "ExportAllDeclaration") {
    return [node.source];
  }

  if (node.type === "ExportNamedDeclaration") {
    return node.source ? [node.source] : [];
  }

  if (node.type === "ImportExpression" || node.type === "TSImportType") {
    return [node.source ?? node.argument];
  }

  return [];
};

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Require cross-feature imports to use the target feature's public entry point.",
    },
    schema: [],
    messages: {
      privateImport:
        "Import another feature through its public index.ts entry point; '{{specifier}}' targets a private module.",
    },
  },
  create(context) {
    const importerPath = context.filename;
    const importerFeature = getFeature(importerPath);

    const checkImport = (node, sourceNode) => {
      const specifier = getSpecifier(sourceNode);

      if (!specifier) {
        return;
      }

      const targetPath = resolveFeatureImport(specifier, importerPath);

      if (!targetPath) {
        return;
      }

      const targetFeature = getFeature(targetPath);

      if (
        !targetFeature ||
        targetFeature.name === importerFeature?.name ||
        isPublicEntry(targetFeature.root, targetPath)
      ) {
        return;
      }

      context.report({
        node: sourceNode ?? node,
        messageId: "privateImport",
        data: { specifier },
      });
    };

    const checkNode = (node) => {
      for (const sourceNode of getImportNodes(node)) {
        checkImport(node, sourceNode);
      }
    };

    return {
      ImportDeclaration: checkNode,
      ExportAllDeclaration: checkNode,
      ExportNamedDeclaration: checkNode,
      ImportExpression: checkNode,
      TSImportType: checkNode,
    };
  },
};
