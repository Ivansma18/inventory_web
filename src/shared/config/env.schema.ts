import { z } from "zod";

const defaultApiProxyTarget = "http://localhost:3000";

const isHttpUrlWithoutCredentials = (value: string): boolean => {
  try {
    const url = new URL(value);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
};

const isPublicApiUrl = (value: string): boolean => {
  if (value.startsWith("/")) {
    return value !== "/" && !value.startsWith("//") && !/[?#\s]/.test(value);
  }

  return isHttpUrlWithoutCredentials(value);
};

const isApiProxyOrigin = (value: string): boolean => {
  if (value.includes("?") || value.includes("#")) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      url.pathname === "/"
    );
  } catch {
    return false;
  }
};

export const publicEnvSchema = z.object({
  VITE_APP_NAME: z.string().trim().min(1, { error: "Must not be empty." }),
  VITE_API_URL: z.string().trim().min(1, { error: "Must not be empty." }).refine(isPublicApiUrl, {
    error: "Must be a relative API prefix or an HTTP(S) URL without credentials.",
  }),
});

export const toolEnvSchema = z.object({
  API_PROXY_TARGET: z
    .string()
    .trim()
    .min(1, { error: "Must not be empty." })
    .refine(isApiProxyOrigin, {
      error: "Must be an HTTP(S) origin without credentials, query, or fragment.",
    })
    .default(defaultApiProxyTarget),
});

export type PublicEnvironment = z.infer<typeof publicEnvSchema>;
export type ToolEnvironment = z.infer<typeof toolEnvSchema>;
