import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RoleProtectedRoute from "./RoleProtectedRoute";

// `RoleProtectedRoute` is a parallel implementation to `ProtectedRoute`
// (not a thin wrapper around it) — it additionally gates on `allowedRoles`
// — so it gets its own test file covering that role-gating behavior
// specifically, rather than sharing ProtectedRoute's test suite.

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const useAuthMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

describe("RoleProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading spinner while auth state is still resolving", () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });

    render(
      <RoleProtectedRoute allowedRoles={["Admin"]}>
        <div>Admin content</div>
      </RoleProtectedRoute>
    );

    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when unauthenticated", () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });

    render(
      <RoleProtectedRoute allowedRoles={["Admin"]}>
        <div>Admin content</div>
      </RoleProtectedRoute>
    );

    expect(pushMock).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  });

  it("redirects to the default '/' when authenticated but role is not allowed", () => {
    useAuthMock.mockReturnValue({
      user: { id: "u1", email: "guest@example.com", name: "Guest", role: "Guest" },
      loading: false,
    });

    render(
      <RoleProtectedRoute allowedRoles={["Admin"]}>
        <div>Admin content</div>
      </RoleProtectedRoute>
    );

    expect(pushMock).toHaveBeenCalledWith("/");
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  });

  it("redirects to a custom redirectTo when the role is not allowed", () => {
    useAuthMock.mockReturnValue({
      user: { id: "u1", email: "staff@example.com", name: "Staff", role: "Healthcare Staff" },
      loading: false,
    });

    render(
      <RoleProtectedRoute allowedRoles={["Admin"]} redirectTo="/programs">
        <div>Admin content</div>
      </RoleProtectedRoute>
    );

    expect(pushMock).toHaveBeenCalledWith("/programs");
  });

  it("renders children when the user's role is allowed", () => {
    useAuthMock.mockReturnValue({
      user: { id: "u1", email: "admin@example.com", name: "Admin", role: "Admin" },
      loading: false,
    });

    render(
      <RoleProtectedRoute allowedRoles={["Admin", "Healthcare Staff"]}>
        <div>Admin content</div>
      </RoleProtectedRoute>
    );

    expect(screen.getByText("Admin content")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
