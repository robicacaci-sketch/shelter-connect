import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoginForm: React.FC = () => {
  const { loginWithDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from =
    (location.state as { from?: Location } | null)?.from?.pathname ??
    "/dashboard";

  const handleLogin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await loginWithDemo();
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.3rem", fontWeight: 700, color: "#0D1F3C" }}>
          Welcome to Pathfinder
        </h2>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#6B8BAE" }}>your path home</p>
      </div>

      <button
        type="button"
        onClick={handleLogin}
        disabled={submitting}
        style={{
          padding: "0.8rem 1rem",
          fontSize: "0.95rem",
          borderRadius: "10px",
          border: "none",
          cursor: submitting ? "not-allowed" : "pointer",
          backgroundColor: "#1A7FD4",
          color: "white",
          fontWeight: 600,
          boxShadow: "0 4px 14px rgba(26,127,212,0.3)",
          opacity: submitting ? 0.7 : 1,
        }}
        aria-label="Continue with demo account"
      >
        {submitting ? "Signing in…" : "Continue with Demo Account"}
      </button>

      {error && (
        <p style={{ color: "#C0391B", fontSize: "0.875rem", margin: 0 }} role="alert">{error}</p>
      )}
      <p style={{ fontSize: "0.8rem", color: "#6B8BAE", margin: 0, lineHeight: 1.5 }}>
        This MVP uses a demo OAuth flow. In production, this button would redirect to a real identity provider.
      </p>
    </div>
  );
};

export default LoginForm;

