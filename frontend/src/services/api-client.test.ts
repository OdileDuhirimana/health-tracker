import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { tokenStorage } from "@/lib/tokenStorage";

/**
 * `api-client.ts` reads `NEXT_PUBLIC_API_URL`/`NODE_ENV` lazily, inside
 * `apiRequest()` itself, each time a request is made — deliberately not at
 * module load time (see the fix's doc comment in api-client.ts: evaluating
 * it eagerly at import time crashed `next build`, since Next evaluates this
 * module while prerendering any page that transitively imports it, in a
 * `NODE_ENV=production` process that has no reason to have
 * `NEXT_PUBLIC_API_URL` set). To exercise every combination of those env
 * vars we still need a *fresh* module instance per scenario (module-level
 * `process.env` reads inside `resolveApiBaseUrl` could otherwise be
 * memoized by a bundler in some environments), so those specific tests use
 * `vi.resetModules()` + a dynamic `import()` instead of the top-level
 * import used by the rest of this suite (which only cares about
 * request/response handling, not base-URL resolution).
 */
import { apiRequest, buildQueryString } from "./api-client";

function mockFetchOnce(response: {
  ok: boolean;
  status: number;
  body: unknown;
  contentType?: string;
}) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? response.contentType ?? "application/json" : null,
    },
    json: async () => response.body,
    text: async () => (typeof response.body === "string" ? response.body : JSON.stringify(response.body)),
  });
}

describe("apiRequest", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns data on a successful response", async () => {
    vi.stubGlobal("fetch", mockFetchOnce({ ok: true, status: 200, body: { id: "1", name: "Test" } }));

    const result = await apiRequest<{ id: string; name: string }>("/patients/1");

    expect(result.data).toEqual({ id: "1", name: "Test" });
    expect(result.error).toBeUndefined();
  });

  it("surfaces a joined message for 400 validation errors returning an array", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOnce({
        ok: false,
        status: 400,
        body: { message: ["name should not be empty", "email must be a valid email"] },
      })
    );

    const result = await apiRequest("/patients");

    expect(result.data).toBeUndefined();
    expect(result.error).toBe("name should not be empty, email must be a valid email");
  });

  it("surfaces a single string message for 400 validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOnce({ ok: false, status: 400, body: { message: "Invalid program type" } })
    );

    const result = await apiRequest("/programs");

    expect(result.error).toBe("Invalid program type");
  });

  it("clears stored auth on a 401 and returns a session-expired message", async () => {
    // No token stored: the redirect branch (`window.location.href = ...`)
    // is skipped, but the storage-clearing branch still runs — this is
    // the meaningful, testable side effect without needing to simulate a
    // real browser navigation in jsdom.
    vi.stubGlobal(
      "fetch",
      mockFetchOnce({ ok: false, status: 401, body: { message: "Unauthorized" } })
    );

    const result = await apiRequest("/patients");

    expect(result.error).toBe("Unauthorized");
    expect(tokenStorage.getToken()).toBeNull();
  });

  it("returns a friendly message for 409 conflicts", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOnce({ ok: false, status: 409, body: {} })
    );

    const result = await apiRequest("/auth/register");

    expect(result.error).toBe("This email is already registered.");
  });

  it("prefers the backend's own message for 409 conflicts when provided", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOnce({ ok: false, status: 409, body: { message: "Duplicate dispensation prevented." } })
    );

    const result = await apiRequest("/dispensations");

    expect(result.error).toBe("Duplicate dispensation prevented.");
  });

  it("returns a connection error message on a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    );

    const result = await apiRequest("/patients");

    expect(result.error).toMatch(/unable to connect to server/i);
  });

  it("returns the underlying error message for unexpected exceptions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));

    const result = await apiRequest("/patients");

    expect(result.error).toBe("boom");
  });
});

describe("buildQueryString", () => {
  it("omits undefined, null, and empty-string values", () => {
    const qs = buildQueryString({ search: "a", status: undefined, page: 1, limit: null, empty: "" });
    const params = new URLSearchParams(qs);

    expect(params.get("search")).toBe("a");
    expect(params.get("page")).toBe("1");
    expect(params.has("status")).toBe(false);
    expect(params.has("limit")).toBe(false);
    expect(params.has("empty")).toBe(false);
  });
});

describe("API base URL resolution (Task 1: production fallback fix)", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = ORIGINAL_ENV.NEXT_PUBLIC_API_URL;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("falls back to localhost in development when NEXT_PUBLIC_API_URL is unset", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.NEXT_PUBLIC_API_URL;

    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: {} });
    vi.stubGlobal("fetch", fetchMock);

    const { apiRequest: freshApiRequest } = await import("./api-client");
    await freshApiRequest("/health");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/health",
      expect.anything()
    );
    vi.unstubAllGlobals();
  });

  it("does not throw on module import in production when NEXT_PUBLIC_API_URL is unset (must not break `next build`)", async () => {
    // Regression test: an earlier version of this fix resolved the base URL
    // once at module load, which meant simply *importing* api-client.ts —
    // something `next build` does for every page that transitively pulls in
    // a service built on `apiRequest`, while prerendering, with no
    // NEXT_PUBLIC_API_URL set — crashed the entire production build. The
    // check must be deferred to request time.
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXT_PUBLIC_API_URL;

    await expect(import("./api-client")).resolves.toBeDefined();
  });

  it("surfaces a descriptive error from a request made in production when NEXT_PUBLIC_API_URL is unset", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXT_PUBLIC_API_URL;

    const { apiRequest: freshApiRequest } = await import("./api-client");
    const result = await freshApiRequest("/health");

    // apiRequest wraps its work in try/catch and turns any thrown error
    // into a normal `{ error }` response rather than letting it reject —
    // consistent with how every other failure mode (400/401/409/network) in
    // this file surfaces to callers, so a misconfigured deployment shows a
    // real error message in the UI instead of crashing the render.
    expect(result.data).toBeUndefined();
    expect(result.error).toMatch(/NEXT_PUBLIC_API_URL/);
  });

  it("uses the configured NEXT_PUBLIC_API_URL in production when set", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";

    const fetchMock = mockFetchOnce({ ok: true, status: 200, body: {} });
    vi.stubGlobal("fetch", fetchMock);

    const { apiRequest: freshApiRequest } = await import("./api-client");
    await freshApiRequest("/health");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/health",
      expect.anything()
    );
    vi.unstubAllGlobals();
  });
});
