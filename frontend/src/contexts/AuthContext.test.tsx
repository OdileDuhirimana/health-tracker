import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";
import { tokenStorage } from "@/lib/tokenStorage";

// `AuthContext` lazily imports "@/lib/api" inside login()/signup() (a
// deliberate code-splitting choice in the source). Mocking the module here
// intercepts both the dynamic and static import forms.
vi.mock("@/lib/api", () => ({
  authApi: {
    login: vi.fn(),
    signup: vi.fn(),
  },
}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

/** Minimal consumer that exposes AuthContext state/actions for assertions. */
function TestConsumer() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? JSON.stringify(user) : "null"}</span>
      <button
        onClick={() => {
          login("test@example.com", "password123").catch(() => {
            // Swallow — individual tests assert on state, not the rejection.
          });
        }}
      >
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("hydrates with no user when no token is stored", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("user")).toHaveTextContent("null");
  });

  it("hydrates the user from previously stored token + user data", async () => {
    tokenStorage.setToken("stored-token", "7d");
    tokenStorage.setUserData({
      id: "u1",
      email: "existing@example.com",
      name: "Existing User",
      role: "Admin",
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    const userText = screen.getByTestId("user").textContent ?? "";
    expect(userText).toContain("existing@example.com");
    expect(userText).toContain("Admin");
  });

  it("logs in successfully, stores the token, and exposes the user/role", async () => {
    const { authApi } = await import("@/lib/api");
    vi.mocked(authApi.login).mockResolvedValue({
      data: {
        access_token: "new-token",
        user: { id: "u2", email: "test@example.com", name: "Test User", role: "Healthcare Staff" },
      },
    });

    const user = userEvent.setup();
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    });
    expect(screen.getByTestId("user")).toHaveTextContent("Healthcare Staff");
    expect(tokenStorage.getToken()).toBe("new-token");
    // Non-Admin, non-Guest roles land on /programs.
    expect(pushMock).toHaveBeenCalledWith("/programs");
  });

  it("redirects Admin users to the dashboard root on login", async () => {
    const { authApi } = await import("@/lib/api");
    vi.mocked(authApi.login).mockResolvedValue({
      data: {
        access_token: "admin-token",
        user: { id: "u3", email: "admin@example.com", name: "Admin User", role: "Admin" },
      },
    });

    const user = userEvent.setup();
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("fails login and leaves the user unauthenticated when credentials are invalid", async () => {
    const { authApi } = await import("@/lib/api");
    vi.mocked(authApi.login).mockResolvedValue({
      error: "Invalid credentials. Please try again.",
    });

    const user = userEvent.setup();
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("user")).toHaveTextContent("null");
    expect(tokenStorage.getToken()).toBeNull();
  });

  it("logs out, clearing stored auth state and redirecting to /login", async () => {
    tokenStorage.setToken("stored-token", "7d");
    tokenStorage.setUserData({
      id: "u1",
      email: "existing@example.com",
      name: "Existing User",
      role: "Admin",
    });

    const user = userEvent.setup();
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("existing@example.com");
    });

    await user.click(screen.getByText("Logout"));

    expect(screen.getByTestId("user")).toHaveTextContent("null");
    expect(tokenStorage.getToken()).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/login");
  });
});
