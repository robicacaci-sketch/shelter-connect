import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { getCurrentUser, loginWithDemoProfile, loginWithEmail as apiLoginWithEmail, registerWithEmail as apiRegisterWithEmail } from "../api/authApi";

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
  loginWithEmail: (email: string, password: string) => Promise<void>;
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

  const applySession = (token: string, user: AuthUser) => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    setState({ isAuthenticated: true, user, token, loading: false });
  };

  const loginWithDemo = async () => {
    const { token, user } = await loginWithDemoProfile();
    applySession(token, user);
  };

  const loginWithEmail = async (email: string, password: string) => {
    const { token, user } = await apiLoginWithEmail(email, password);
    applySession(token, user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { token, user } = await apiRegisterWithEmail(name, email, password);
    applySession(token, user);
  };

  const logout = () => {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    setState({ isAuthenticated: false, user: null, token: null, loading: false });
  };

  const value: AuthContextValue = useMemo(
    () => ({ ...state, loginWithDemo, loginWithEmail, register, logout }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
