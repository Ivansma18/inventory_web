import { createAuthClient } from "better-auth/react";

import { createAuthFetchOptions } from "./auth-transport";
import { createInventoryAuthPlugin } from "../inventory-auth-plugin";

export const authClient = createAuthClient({
  baseURL: "/api/auth",
  fetchOptions: createAuthFetchOptions(),
  plugins: [createInventoryAuthPlugin()],
});
