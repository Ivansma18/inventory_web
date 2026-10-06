import { expect, test, type Page, type Request } from "@playwright/test";
import type { SignInCredentials } from "@/features/auth";

const authSessionCookieName = "better-auth.session_token";

type AuthHarnessCommand = "sign-in" | "sign-out" | "refetch";

interface AuthResponseRecord {
  method: string;
  path: string;
  status: number | null;
  hasSessionCookieHeader: boolean | null;
  hasTrustedFrontendOrigin: boolean | null;
  contentType: string | null;
  bodyLength: number;
  hasSetCookieHeader: boolean | null;
  cacheControl: string | null;
  errorCode: string | null;
  errorCategory: "origin" | "session" | "request" | "other" | null;
  errorBodyRead: boolean;
}

const getTestCredentials = (): SignInCredentials => {
  const email = process.env.AUTH_TEST_EMAIL?.trim();
  const password = process.env.AUTH_TEST_PASSWORD;
  const missingVariables = [
    ...(email ? [] : ["AUTH_TEST_EMAIL"]),
    ...(password?.trim() ? [] : ["AUTH_TEST_PASSWORD"]),
  ];

  expect(
    missingVariables,
    `auth-real requires ${missingVariables.join(", ")}. Configure them in the ignored .env file or the test process; values are never printed.`,
  ).toEqual([]);

  if (!email || !password) {
    throw new Error("The private auth test account is not configured.");
  }

  return { email, password };
};

const hasResponse = (
  responses: AuthResponseRecord[],
  method: string,
  path: string,
  status: number,
  afterIndex = 0,
): boolean =>
  responses
    .slice(afterIndex)
    .some(
      (response) =>
        response.method === method && response.path === path && response.status === status,
    );

const sessionResponses = (responses: AuthResponseRecord[]) =>
  responses.filter(
    (response) => response.method === "GET" && response.path === "/api/auth/get-session",
  );

const hasBrowserSessionCookie = async (page: Page): Promise<boolean> => {
  const cookies = await page.context().cookies("http://localhost:5174");
  return cookies.some(
    (cookie) => cookie.name === authSessionCookieName && cookie.httpOnly && cookie.value.length > 0,
  );
};

const dispatchHarnessCommand = async (
  page: Page,
  command: AuthHarnessCommand,
  credentials: SignInCredentials | null = null,
): Promise<void> => {
  await page.evaluate(
    ({ command: harnessCommand, credentials: signInCredentials }) => {
      window.postMessage(
        {
          channel: "inventory-auth-test",
          command: harnessCommand,
          credentials: signInCredentials,
        },
        window.location.origin,
      );
    },
    { command, credentials },
  );
};

const cleanupBrowserSession = async (page: Page): Promise<boolean> => {
  try {
    const browserSignOut = await page.request.post("http://localhost:5174/api/auth/sign-out", {
      headers: { origin: "http://localhost:5174" },
      data: {},
    });
    if (browserSignOut.status() !== 204) {
      return false;
    }

    const sessionAfterSignOut = await page.request.get(
      "http://localhost:5174/api/auth/get-session",
    );
    return sessionAfterSignOut.status() === 401;
  } catch {
    return false;
  }
};

test("auth-real completes the browser cookie session lifecycle", async ({ page }) => {
  const credentials = getTestCredentials();
  const authResponses: AuthResponseRecord[] = [];

  const authRequests = new Map<Request, AuthResponseRecord>();

  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (
      requestUrl.pathname === "/api/auth/get-session" ||
      requestUrl.pathname === "/api/auth/sign-in/email" ||
      requestUrl.pathname === "/api/auth/sign-out"
    ) {
      const record: AuthResponseRecord = {
        method: request.method(),
        path: requestUrl.pathname,
        status: null,
        hasSessionCookieHeader: null,
        hasTrustedFrontendOrigin: null,
        contentType: request.headers()["content-type"] ?? null,
        bodyLength: request.postDataBuffer()?.length ?? 0,
        hasSetCookieHeader: null,
        cacheControl: null,
        errorCode: null,
        errorCategory: null,
        errorBodyRead: false,
      };

      authResponses.push(record);
      authRequests.set(request, record);
      void request
        .allHeaders()
        .then((headers) => {
          const cookieHeader = headers.cookie ?? "";
          const sessionCookie = cookieHeader
            .split(";")
            .map((part) => part.trim())
            .find((part) => part.split("=", 1)[0] === authSessionCookieName);
          record.hasTrustedFrontendOrigin = headers.origin === "http://localhost:5174";
          record.hasSessionCookieHeader = sessionCookie
            ? sessionCookie.slice(sessionCookie.indexOf("=") + 1).length > 0
            : false;
        })
        .catch(() => {
          record.hasSessionCookieHeader = false;
        });
    }
  });

  page.on("response", (response) => {
    const record = authRequests.get(response.request());
    if (record) {
      record.status = response.status();
      void response
        .allHeaders()
        .then((headers) => {
          record.hasSetCookieHeader = Boolean(headers["set-cookie"]);
          record.cacheControl = headers["cache-control"] ?? null;
        })
        .catch(() => {
          record.hasSetCookieHeader = false;
          record.cacheControl = null;
        });

      if (response.status() < 400) {
        record.errorBodyRead = true;
      } else {
        void response
          .json()
          .then((body: unknown) => {
            if (
              typeof body === "object" &&
              body !== null &&
              "error" in body &&
              typeof body.error === "object" &&
              body.error !== null &&
              "code" in body.error &&
              typeof body.error.code === "string"
            ) {
              record.errorCode = body.error.code;
            }

            if (
              typeof body === "object" &&
              body !== null &&
              "error" in body &&
              typeof body.error === "object" &&
              body.error !== null &&
              "message" in body.error &&
              typeof body.error.message === "string"
            ) {
              const safeMessageCategory = body.error.message.toLowerCase();
              record.errorCategory = safeMessageCategory.includes("origin")
                ? "origin"
                : safeMessageCategory.includes("session") || safeMessageCategory.includes("cookie")
                  ? "session"
                  : safeMessageCategory.includes("request") || safeMessageCategory.includes("body")
                    ? "request"
                    : "other";
            }
          })
          .catch(() => undefined)
          .finally(() => {
            record.errorBodyRead = true;
          });
      }
    }
  });

  let cleanupRequired = false;

  try {
    expect(await hasBrowserSessionCookie(page)).toBe(false);

    await page.goto("/__auth-test");

    const sessionState = page.getByTestId("auth-session-state");
    const operationState = page.getByTestId("auth-operation-state");

    await expect(sessionState).toHaveAttribute("data-status", "unauthenticated");
    await expect
      .poll(() => hasResponse(authResponses, "GET", "/api/auth/get-session", 401))
      .toBe(true);
    expect(await hasBrowserSessionCookie(page)).toBe(false);

    cleanupRequired = true;
    await dispatchHarnessCommand(page, "sign-in", credentials);
    await expect(operationState).toHaveAttribute("data-command", "sign-in");
    await expect(operationState).toHaveAttribute("data-status", "succeeded");
    await expect(sessionState).toHaveAttribute("data-status", "authenticated");
    await expect
      .poll(() => hasResponse(authResponses, "POST", "/api/auth/sign-in/email", 200))
      .toBe(true);
    await expect.poll(() => hasBrowserSessionCookie(page)).toBe(true);

    await dispatchHarnessCommand(page, "refetch");
    await expect(operationState).toHaveAttribute("data-command", "refetch");
    await expect(operationState).toHaveAttribute("data-status", "succeeded");
    await expect(sessionState).toHaveAttribute("data-status", "authenticated");
    await expect
      .poll(() => hasResponse(authResponses, "GET", "/api/auth/get-session", 200))
      .toBe(true);

    const visibleAuthState = `${await sessionState.textContent()}${await operationState.textContent()}`;
    const exposedCredential = [credentials.email, credentials.password].some((value) =>
      visibleAuthState.includes(value),
    );
    expect(exposedCredential, "Auth harness output must not expose test credentials.").toBe(false);

    await dispatchHarnessCommand(page, "sign-out");
    await expect(operationState).toHaveAttribute("data-command", "sign-out");
    const signOutResponse = [...authResponses]
      .reverse()
      .find((response) => response.method === "POST" && response.path === "/api/auth/sign-out");
    if (!signOutResponse) {
      throw new Error("The browser did not receive a response for the sign-out request.");
    }
    await expect.poll(() => signOutResponse.errorBodyRead).toBe(true);
    if (signOutResponse.status !== 204) {
      await expect.poll(() => signOutResponse.hasSessionCookieHeader !== null).toBe(true);
      throw new Error(
        `Backend sign-out failed with HTTP ${signOutResponse.status}, code ${signOutResponse.errorCode ?? "unknown"}, category=${signOutResponse.errorCategory ?? "unknown"}, trusted frontend Origin=${signOutResponse.hasTrustedFrontendOrigin}, session cookie sent=${signOutResponse.hasSessionCookieHeader}, content type=${signOutResponse.contentType ?? "none"}, body bytes=${signOutResponse.bodyLength}.`,
      );
    }
    await expect(operationState).toHaveAttribute("data-status", "succeeded");
    await expect(sessionState).toHaveAttribute("data-status", "unauthenticated");
    await expect
      .poll(() =>
        authResponses.some(
          (response) =>
            response.method === "POST" &&
            response.path === "/api/auth/sign-out" &&
            response.status === 204 &&
            response.hasSessionCookieHeader,
        ),
      )
      .toBe(true);

    const sessionResponseCountBeforeFinalRefetch = sessionResponses(authResponses).length;
    await dispatchHarnessCommand(page, "refetch");
    await expect(operationState).toHaveAttribute("data-command", "refetch");
    await expect(operationState).toHaveAttribute("data-status", "succeeded");
    await expect
      .poll(() => sessionResponses(authResponses).length)
      .toBeGreaterThan(sessionResponseCountBeforeFinalRefetch);
    const sessionRequestsAfterLogout = sessionResponses(authResponses).slice(
      sessionResponseCountBeforeFinalRefetch,
    );
    const sessionStatusesAfterLogout = sessionRequestsAfterLogout.map(
      (response) => response.status,
    );
    const signOutObservation = [...authResponses]
      .reverse()
      .find((response) => response.method === "POST" && response.path === "/api/auth/sign-out");
    expect(
      sessionStatusesAfterLogout,
      `The backend must reject the browser session after logout. Sanitized observations: ${JSON.stringify(
        {
          signOut: signOutObservation
            ? {
                status: signOutObservation.status,
                hasSessionCookieHeader: signOutObservation.hasSessionCookieHeader,
                hasSetCookieHeader: signOutObservation.hasSetCookieHeader,
              }
            : null,
          sessionChecks: sessionRequestsAfterLogout.map(
            ({ status, hasSessionCookieHeader, cacheControl }) => ({
              status,
              hasSessionCookieHeader,
              cacheControl,
            }),
          ),
        },
      )}`,
    ).toEqual([401]);
    await expect(sessionState).toHaveAttribute("data-status", "unauthenticated");
    expect(await hasBrowserSessionCookie(page)).toBe(false);
    cleanupRequired = false;
  } finally {
    if (cleanupRequired && !page.isClosed()) {
      let cleanedUp = false;
      try {
        await dispatchHarnessCommand(page, "sign-out");
        await expect(page.getByTestId("auth-operation-state")).toHaveAttribute(
          "data-status",
          "succeeded",
          { timeout: 10_000 },
        );
        const sessionAfterBrowserSignOut = await page.request.get(
          "http://localhost:5174/api/auth/get-session",
        );
        cleanedUp = sessionAfterBrowserSignOut.status() === 401;
      } catch {
        // Cleanup is best-effort and must not print request or cookie contents.
      }

      if (!cleanedUp) {
        await cleanupBrowserSession(page);
      }
    }
  }
});
