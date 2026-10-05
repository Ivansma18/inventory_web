import { createAuthClient } from "better-auth/react";

import { createAuthFetchOptions } from "./auth-transport";

export const authClient = createAuthClient({
  baseURL: "/api/auth",
  fetchOptions: createAuthFetchOptions(),
});
