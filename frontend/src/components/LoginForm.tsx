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
    <div
      style={{
        maxWidth: "400px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}
    >
      <button
        type="button"
        onClick={handleLogin}
        disabled={submitting}
        style={{
          padding: "0.75rem 1rem",
          fontSize: "1rem",
          borderRadius: "0.5rem",
          border: "none",
          cursor: "pointer",
          backgroundColor: "#2563eb",
          color: "white"
        }}
        aria-label="Continue with demo account"
      >
        {submitting ? "Signing in..." : "Continue with Demo Account"}
      </button>
      {error && (
        <p style={{ color: "#b91c1c" }} role="alert">
          {error}
        </p>
      )}
      <p style={{ fontSize: "0.875rem", color: "#4b5563" }}>
        This MVP uses a demo OAuth flow. In production, this button would
        redirect to a real identity provider (e.g., Google or Auth0).
      </p>
    </div>
  );
};

export default LoginForm;

