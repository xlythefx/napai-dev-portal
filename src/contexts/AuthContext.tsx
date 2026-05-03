import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const AUTH_KEY = "napai_auth";
export const UNI_ID_KEY = "napai_uni_id";

export interface AuthUser {
  id?: number;
  uni_id?: number;
  email: string;
  name?: string;
  role?: string;
  loggedInAt: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoaded: boolean;
  login: (email: string, name?: string, role?: string, id?: number, uniId?: number) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        setUser(parsed);
        if (parsed.uni_id != null) {
          localStorage.setItem(UNI_ID_KEY, String(parsed.uni_id));
        } else if (parsed.id != null) {
          localStorage.setItem(UNI_ID_KEY, String(parsed.id));
        }
      }
    } catch {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(UNI_ID_KEY);
    }
    setLoaded(true);
  }, []);

  const login = (email: string, name?: string, role?: string, id?: number, uniId?: number) => {
    const uid = uniId ?? id;
    const authUser: AuthUser = {
      id: id ?? uid,
      uni_id: uid,
      email,
      name,
      role: role ?? "developer",
      loggedInAt: Date.now(),
    };
    setUser(authUser);
    localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
    if (uid != null) {
      localStorage.setItem(UNI_ID_KEY, String(uid));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(UNI_ID_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isLoaded: loaded,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
