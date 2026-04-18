import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  getCurrentUser,
  loginWithDemoProfile,
  loginWithEmail,
  registerWithEmail
} from "../api/authApi";

type AuthUser = {
  id: string;
  email: string;
  name: string;
};

type AuthState = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  loginWithDemo: () => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_TOKEN_KEY = "housing_readiness_auth_token";

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true
};

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
      if (!storedToken) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const user = await getCurrentUser(storedToken);
        setState({ isAuthenticated: true, user, token: storedToken, loading: false });
      } catch {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        setState({ isAuthenticated: false, user: null, token: null, loading: false });
      }
    };

    void restoreSession();
  }, []);

  const applyToken = (token: string, user: AuthUser) => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    setState({ isAuthenticated: true, user, token, loading: false });
  };

  const loginWithDemo = async () => {
    const { token, user } = await loginWithDemoProfile();
    applyToken(token, user);
  };

  const loginEmail = async (email: string, password: string) => {
    const { token, user } = await loginWithEmail(email, password);
    applyToken(token, user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { token, user } = await registerWithEmail(name, email, password);
    applyToken(token, user);
  };

  const logout = () => {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    setState({ isAuthenticated: false, user: null, token: null, loading: false });
  };

  const value: AuthContextValue = useMemo(
    () => ({ ...state, loginWithDemo, loginEmail, register, logout }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
