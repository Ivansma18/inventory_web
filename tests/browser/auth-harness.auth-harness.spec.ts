import { expect, test } from "@playwright/test";
import type { SignInCredentials } from "@/features/auth";

test("Auth E2E harness consumes public Auth hooks and receives credentials in memory", async ({
  page,
}) => {
  const credentials: SignInCredentials = {
    email: "auth-harness@example.invalid",
    password: "in-memory-test-credential",
  };
  let credentialsMatched = false;
  let signInRequestCount = 0;
  let signInRequestPath = "";

  await page.route("**/api/auth/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname.endsWith("/get-session")) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "UNAUTHORIZED", message: "No active session." } }),
      });
      return;
    }

    if (requestUrl.pathname.includes("sign-in")) {
      signInRequestCount += 1;
      signInRequestPath = requestUrl.pathname;
      const requestBody: unknown = route.request().postDataJSON();
      if (typeof requestBody === "object" && requestBody !== null) {
        const body = requestBody as Record<string, unknown>;
        credentialsMatched =
          body.email === credentials.email && body.password === credentials.password;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            user: { id: "harness-user", email: credentials.email, role: "OPERATOR" },
            session: { id: "harness-session", createdAt: "2026-01-01T00:00:00.000Z" },
          },
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto("/__auth-test");

  const harnessEntryScripts = await page.locator('script[src*="auth-real-harness.tsx"]').count();
  expect(harnessEntryScripts).toBe(1);
  await expect(page.getByRole("heading", { level: 1, name: "Auth test harness" })).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.locator("input")).toHaveCount(0);
  await expect(page.getByTestId("auth-session-state")).toHaveAttribute(
    "data-status",
    "unauthenticated",
  );

  await page.evaluate((signInCredentials) => {
    window.postMessage(
      {
        channel: "inventory-auth-test",
        command: "sign-in",
        credentials: signInCredentials,
      },
      window.location.origin,
    );
  }, credentials);

  await expect(page.getByTestId("auth-operation-state")).toHaveAttribute(
    "data-status",
    "succeeded",
  );
  await expect(page.getByTestId("auth-session-state")).toHaveAttribute(
    "data-status",
    "authenticated",
  );
  expect(signInRequestCount).toBe(1);
  expect(credentialsMatched).toBe(true);
  expect(signInRequestPath).toBe("/api/auth/sign-in/email");

  const visibleOutput = `${await page.getByTestId("auth-session-state").textContent()}${await page
    .getByTestId("auth-operation-state")
    .textContent()}`;
  const leakedCredential = visibleOutput.includes(credentials.password);
  const leakedSensitiveField = /"(?:token|expiresAt|cookie)"\s*:/i.test(visibleOutput);

  expect(leakedCredential).toBe(false);
  expect(leakedSensitiveField).toBe(false);
});
