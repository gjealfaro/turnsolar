"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// ✏️ Change these passwords
export const PASSWORDS = {
  admin: "Ua1mn3j9", // Full access: create offers + manage products
  user: "RqQMNMK9", // Limited: create offers only
};

export type Role = "admin" | "user" | null;

type AuthContextType = {
  role: Role;
  login: (password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
  isLoggedIn: boolean;
};

const AuthContext = createContext<AuthContextType>({
  role: null,
  login: () => false,
  logout: () => {},
  isAdmin: false,
  isLoggedIn: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("solar_role") as Role;
    if (saved === "admin" || saved === "user") setRole(saved);
    setHydrated(true);
  }, []);

  const login = (password: string): boolean => {
    if (password === PASSWORDS.admin) {
      setRole("admin");
      sessionStorage.setItem("solar_role", "admin");
      return true;
    }
    if (password === PASSWORDS.user) {
      setRole("user");
      sessionStorage.setItem("solar_role", "user");
      return true;
    }
    return false;
  };

  const logout = () => {
    setRole(null);
    sessionStorage.removeItem("solar_role");
  };

  if (!hydrated) return null;

  return (
    <AuthContext.Provider
      value={{
        role,
        login,
        logout,
        isAdmin: role === "admin",
        isLoggedIn: role !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
