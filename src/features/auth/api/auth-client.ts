import { createAuthClient } from "better-auth/react";

import { createAuthFetchOptions } from "./auth-transport";
import { createInventoryAuthPlugin } from "../inventory-auth-plugin";

const authBaseURL = new URL("/api/auth", window.location.origin).toString();

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  fetchOptions: createAuthFetchOptions(),
  plugins: [createInventoryAuthPlugin()],
});
