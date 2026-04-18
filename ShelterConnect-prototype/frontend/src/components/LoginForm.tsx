import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Tab = "signin" | "register";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.875rem",
  fontSize: "0.95rem",
  borderRadius: "0.5rem",
  border: "1px solid #d1d5db",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  fontSize: "0.95rem",
  fontWeight: 600,
  borderRadius: "0.5rem",
  border: "none",
  cursor: "pointer",
  backgroundColor: "#2563eb",
  color: "white",
};

const btnDemo: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 1rem",
  fontSize: "0.85rem",
  borderRadius: "0.5rem",
  border: "1px solid #d1d5db",
  cursor: "pointer",
  backgroundColor: "transparent",
  color: "#6b7280",
};

const LoginForm: React.FC = () => {
  const { loginWithDemo, loginEmail, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState<Tab>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from =
    (location.state as { from?: Location } | null)?.from?.pathname ?? "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === "register") {
      if (!name.trim()) { setError("Please enter your full name."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      if (password !== confirm) { setError("Passwords do not match."); return; }
    }

    setSubmitting(true);
    try {
      if (tab === "signin") {
        await loginEmail(email, password);
      } else {
        await register(name.trim(), email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await loginWithDemo();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Tab switcher */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
        {(["signin", "register"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setError(null); }}
            style={{
              flex: 1,
              padding: "0.65rem",
              fontSize: "0.9rem",
              fontWeight: tab === t ? 700 : 400,
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent",
              color: tab === t ? "#2563eb" : "#6b7280",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t === "signin" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {tab === "register" && (
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>
              Full Name
            </label>
            <input
              type="text"
              required
              autoComplete="name"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>
            Email
          </label>
          <input
            type="email"
            required
            autoComplete={tab === "signin" ? "username" : "email"}
            placeholder="you@shelter.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>
            Password
          </label>
          <input
            type="password"
            required
            autoComplete={tab === "signin" ? "current-password" : "new-password"}
            placeholder={tab === "signin" ? "Your password" : "At least 6 characters"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        {tab === "register" && (
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>
              Confirm Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        {error && (
          <p role="alert" style={{ margin: 0, fontSize: "0.85rem", color: "#dc2626", background: "#fef2f2", padding: "0.6rem 0.75rem", borderRadius: "0.375rem", border: "1px solid #fecaca" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} style={{ ...btnPrimary, opacity: submitting ? 0.7 : 1 }}>
          {submitting
            ? (tab === "signin" ? "Signing in…" : "Creating account…")
            : (tab === "signin" ? "Sign In" : "Create Account")}
        </button>
      </form>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
        <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
      </div>

      {/* Demo login */}
      <button type="button" onClick={handleDemo} disabled={submitting} style={{ ...btnDemo, opacity: submitting ? 0.7 : 1 }}>
        Continue with Demo Account
      </button>
    </div>
  );
};

export default LoginForm;
