import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Tab = "signin" | "register";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.85rem",
  fontSize: "0.9rem",
  borderRadius: "8px",
  border: "1px solid #DDEAF7",
  background: "#F4F9FF",
  color: "#0D1F3C",
  outline: "none",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#6B8BAE",
  marginBottom: "0.35rem",
};

const PRIMARY_BTN: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  fontSize: "0.95rem",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  backgroundColor: "#1A7FD4",
  color: "white",
  fontWeight: 600,
  boxShadow: "0 4px 14px rgba(26,127,212,0.25)",
};

const GHOST_BTN: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 1rem",
  fontSize: "0.85rem",
  borderRadius: "10px",
  border: "1px solid #DDEAF7",
  cursor: "pointer",
  backgroundColor: "transparent",
  color: "#6B8BAE",
  fontWeight: 500,
};

const LoginForm: React.FC = () => {
  const { loginWithDemo, loginWithEmail, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as { from?: Location } | null)?.from?.pathname ?? "/dashboard";

  const [tab, setTab] = useState<Tab>("signin");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign in fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const handleSuccess = () => navigate(from, { replace: true });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithEmail(signInEmail.trim(), signInPassword);
      handleSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (regPassword !== regConfirm) {
      setError("Passwords do not match.");
      return;
    }
    if (regPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await register(regName.trim(), regEmail.trim(), regPassword);
      handleSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithDemo();
      handleSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setError(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "0.25rem" }}>
        <h2 style={{ margin: "0 0 0.2rem", fontSize: "1.25rem", fontWeight: 700, color: "#0D1F3C" }}>
          Welcome to Pathfinder
        </h2>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#6B8BAE" }}>your path home</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderRadius: "10px", background: "#F4F9FF", border: "1px solid #DDEAF7", padding: "3px", gap: "3px" }}>
        {(["signin", "register"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "0.83rem",
              fontWeight: 600,
              transition: "all 0.15s",
              background: tab === t ? "#FFFFFF" : "transparent",
              color: tab === t ? "#0D1F3C" : "#6B8BAE",
              boxShadow: tab === t ? "0 1px 4px rgba(13,31,60,0.1)" : "none",
            }}
          >
            {t === "signin" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      {/* Sign In form */}
      {tab === "signin" && (
        <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <label style={LABEL_STYLE} htmlFor="signin-email">Email</label>
            <input
              id="signin-email"
              type="email"
              required
              autoComplete="email"
              value={signInEmail}
              onChange={(e) => setSignInEmail(e.target.value)}
              style={INPUT_STYLE}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label style={LABEL_STYLE} htmlFor="signin-password">Password</label>
            <input
              id="signin-password"
              type="password"
              required
              autoComplete="current-password"
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
              style={INPUT_STYLE}
              placeholder="••••••••"
            />
          </div>
          {error && <p style={{ margin: 0, color: "#C0391B", fontSize: "0.82rem" }} role="alert">{error}</p>}
          <button type="submit" disabled={submitting} style={{ ...PRIMARY_BTN, opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      )}

      {/* Register form */}
      {tab === "register" && (
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <label style={LABEL_STYLE} htmlFor="reg-name">Full name</label>
            <input
              id="reg-name"
              type="text"
              required
              autoComplete="name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              style={INPUT_STYLE}
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label style={LABEL_STYLE} htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              style={INPUT_STYLE}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label style={LABEL_STYLE} htmlFor="reg-password">Password <span style={{ fontWeight: 400, color: "#6B8BAE" }}>(min 8 chars)</span></label>
            <input
              id="reg-password"
              type="password"
              required
              autoComplete="new-password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              style={INPUT_STYLE}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label style={LABEL_STYLE} htmlFor="reg-confirm">Confirm password</label>
            <input
              id="reg-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={regConfirm}
              onChange={(e) => setRegConfirm(e.target.value)}
              style={INPUT_STYLE}
              placeholder="••••••••"
            />
          </div>
          {error && <p style={{ margin: 0, color: "#C0391B", fontSize: "0.82rem" }} role="alert">{error}</p>}
          <button type="submit" disabled={submitting} style={{ ...PRIMARY_BTN, opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
            {submitting ? "Creating account…" : "Create Account"}
          </button>
        </form>
      )}

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ flex: 1, height: "1px", background: "#DDEAF7" }} />
        <span style={{ fontSize: "0.75rem", color: "#6B8BAE", flexShrink: 0 }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "#DDEAF7" }} />
      </div>

      {/* Demo button */}
      <button
        type="button"
        onClick={handleDemo}
        disabled={submitting}
        style={{ ...GHOST_BTN, opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
      >
        Continue with Demo Account
      </button>
    </div>
  );
};

export default LoginForm;
