import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { usePublicIdentity } from "@/app/hooks/use-public-identity";
import { formatPublicIdentity } from "@/app/utils/format-public-identity";
import { useSession } from "@/features/auth";
import { server } from "../mocks/server";

describe("public identity", () => {
  it.each([
    ["prefers a trimmed public name", "  Marina Solís  ", "marina@example.com", "Marina Solís"],
    [
      "uses the public email when there is no name",
      null,
      "  marina@example.com  ",
      "marina@example.com",
    ],
    ["uses the generic label when both values are blank", "  ", "  ", "Usuario"],
    ["uses the generic label when values are absent", undefined, undefined, "Usuario"],
  ])("%s", (_description, name, email, expected) => {
    expect(formatPublicIdentity(name, email)).toBe(expected);
  });

  it("derives identity from the confirmed public Auth email and ignores incomplete responses", async () => {
    let requestCount = 0;
    server.use(
      http.get(/\/api\/auth\/get-session/, () => {
        requestCount += 1;
        if (requestCount === 1) {
          return HttpResponse.json({
            data: {
              user: { id: "identity-user", email: "operator@example.com", role: "OPERATOR" },
              session: { id: "identity-session", createdAt: "2026-01-01T00:00:00.000Z" },
            },
          });
        }

        return HttpResponse.json({
          data: {
            user: { id: "incomplete-user", email: "untrusted@example.com" },
            session: { id: "incomplete-session", createdAt: "2026-01-01T00:00:00.000Z" },
          },
        });
      }),
    );

    const { result } = renderHook(() => ({ identity: usePublicIdentity(), session: useSession() }));

    expect(result.current.identity).toBeNull();
    await waitFor(() => expect(result.current.identity).toBe("operator@example.com"));

    await act(async () => {
      await result.current.session.refetch();
    });

    expect(result.current.session.status).toBe("unconfirmed");
    expect(result.current.session.verification.status).toBe("error");
    expect(result.current.identity).toBeNull();
  });
});
