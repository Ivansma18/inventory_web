import { expect, test } from "@playwright/test";

test("auth-real has its private test account configured", () => {
  const requiredVariables = ["AUTH_TEST_EMAIL", "AUTH_TEST_PASSWORD"] as const;
  const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim());

  expect(
    missingVariables,
    `auth-real requires ${missingVariables.join(", ")}. Configure those variables in the test process; their values are never printed.`,
  ).toEqual([]);
});
