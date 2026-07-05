import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProtectedRoute from "./ProtectedRoute";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const useAuthMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading spinner while auth state is still resolving", () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });

    render(
      <ProtectedRoute>
        <div>Secret content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to /login and renders nothing when unauthenticated", () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });

    render(
      <ProtectedRoute>
        <div>Secret content</div>
      </ProtectedRoute>
    );

    expect(pushMock).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
  });

  it("renders children once authenticated", () => {
    useAuthMock.mockReturnValue({
      user: { id: "u1", email: "a@b.com", name: "A", role: "Admin" },
      loading: false,
    });

    render(
      <ProtectedRoute>
        <div>Secret content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Secret content")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
