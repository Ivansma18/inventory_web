import { publicEnvSchema } from "./env.schema.ts";

export const env = publicEnvSchema.parse({
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  VITE_API_URL: import.meta.env.VITE_API_URL,
});
