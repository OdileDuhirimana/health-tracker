"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { tokenStorage } from "@/lib/tokenStorage";

type User = {
  id: string;
  email: string;
  name: string;
  role: "Admin" | "Healthcare Staff" | "Guest";
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string, role: string, remember?: boolean) => Promise<void>;
  signup: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Use secure token storage
    if (typeof window !== "undefined") {
      try {
        // Try new secure storage first
        const storedToken = tokenStorage.getToken();
        const storedUser = tokenStorage.getUserData();
        
        if (storedToken && storedUser) {
          setUser({
            ...storedUser,
            role: storedUser.role as User["role"],
          });
        } else {
          // Fallback to legacy storage for migration
          const legacyAuth = localStorage.getItem("auth");
          if (legacyAuth) {
            try {
              const parsed = JSON.parse(legacyAuth);
              if (parsed.token || parsed.access_token) {
                // Migrate to secure storage
                tokenStorage.setToken(parsed.token || parsed.access_token);
                const userData = {
                  id: parsed.id || "",
                  email: parsed.email,
                  name: parsed.name || parsed.email?.split("@")[0],
                  role: parsed.role,
                };
                tokenStorage.setUserData(userData);
                setUser(userData);
                // Clear legacy storage
                localStorage.removeItem("auth");
              }
            } catch {
              localStorage.removeItem("auth");
            }
          }
        }
      } catch (error) {
        tokenStorage.clearAll();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, role: string = "", remember = false) => {
    setLoading(true);
    try {
      const { authApi } = await import("@/lib/api");
      // Login without role - backend determines role from user account
      const response = await authApi.login(email, password);
      
      if (response.data) {
        const { user: apiUser, access_token } = response.data;
        const userData = {
          id: apiUser.id || "",
          email: apiUser.email || email,
          name: apiUser.name || email.split("@")[0],
          role: (apiUser.role || "Guest") as User["role"],
        };
        
        // Store token securely
        tokenStorage.setToken(access_token, "7d"); // 7 days expiry
        tokenStorage.setUserData(userData);
        
        // Legacy support - clear old storage
        localStorage.removeItem("auth");
        
        setUser(userData);
        // Redirect Guest users to programs page, Admin to dashboard, others to programs
        if (userData.role === "Guest") {
          router.push("/programs");
        } else if (userData.role === "Admin") {
          router.push("/");
        } else {
          router.push("/programs");
        }
      } else {
        // Throw error to be handled by the UI
        throw new Error(response.error || "Invalid credentials. Please try again.");
      }
    } catch (error) {
      // Re-throw error so UI can display it
      setLoading(false);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Login failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string, role: string) => {
    setLoading(true);
    try {
      const { authApi } = await import("@/lib/api");
      const response = await authApi.signup(email, password, name, role);
      
      if (response.data) {
        // After successful registration, automatically log the user in
        const apiUser = response.data;
        const loginResponse = await authApi.login(email, password);
        
        if (loginResponse.data && loginResponse.data.access_token) {
          const userData = {
            id: apiUser.id || "",
            email: apiUser.email || email,
            name: apiUser.name || name,
            role: (apiUser.role || role) as User["role"],
          };
          
          // Store token securely
          tokenStorage.setToken(loginResponse.data.access_token, "7d");
          tokenStorage.setUserData(userData);
          
          // Legacy support - clear old storage
          localStorage.removeItem("auth");
          
          setUser(userData);
          // Redirect Guest users to programs page, Admin to dashboard, others to programs
          if (userData.role === "Guest") {
            router.push("/programs");
          } else if (userData.role === "Admin") {
            router.push("/");
          } else {
            router.push("/programs");
          }
        } else {
          // If auto-login fails, redirect to login page
          throw new Error("Registration successful. Please login to continue.");
        }
      } else {
        // Throw error to be handled by the UI
        throw new Error(response.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      // Re-throw error so UI can display it
      setLoading(false);
      throw error instanceof Error ? error : new Error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    tokenStorage.clearAll();
    setUser(null);
    router.push("/login");
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    tokenStorage.setUserData(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
