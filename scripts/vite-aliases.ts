import { resolve } from "node:path";

export const createViteAliases = (projectRoot: string) => ({
  "@/app": resolve(projectRoot, "src/app"),
  "@/features": resolve(projectRoot, "src/features"),
  "@/shared": resolve(projectRoot, "src/shared"),
});
