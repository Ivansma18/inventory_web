import * as z from "zod";

import type { components } from "@/shared/api/generated/auth-contracts";

const publicAuthUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  role: z.enum(["ADMIN", "MANAGER", "OPERATOR", "VIEWER"]),
}) satisfies z.ZodType<components["schemas"]["PublicAuthUser"]>;

const publicAuthSessionSchema = z.object({
  id: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
}) satisfies z.ZodType<components["schemas"]["PublicAuthSession"]>;

export const publicAuthResponseSchema = z.object({
  data: z.object({
    user: publicAuthUserSchema,
    session: publicAuthSessionSchema,
  }),
}) satisfies z.ZodType<components["schemas"]["PublicAuthResponse"]>;

export type PublicAuthResponse = z.infer<typeof publicAuthResponseSchema>;

export const parsePublicAuthResponse = (value: unknown): PublicAuthResponse =>
  publicAuthResponseSchema.parse(value);
