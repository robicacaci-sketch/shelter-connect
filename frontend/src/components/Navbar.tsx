import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar: React.FC = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      backgroundColor: "#FFFFFF",
      borderBottom: "1px solid #DDEAF7",
      height: "60px",
      display: "flex",
      alignItems: "center",
      padding: "0 2rem",
      justifyContent: "space-between",
      boxShadow: "0 1px 8px rgba(26,127,212,0.07)",
    }}>
      {/* Logo + wordmark */}
      <Link to="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: "#1A7FD4", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H15v-5h-6v5H4a1 1 0 01-1-1V10.5z" fill="white" />
            <circle cx="17" cy="17" r="3" fill="white" />
            <path d="M17 14.5c-1.38 0-2.5 1.12-2.5 2.5 0 1.88 2.5 4.5 2.5 4.5s2.5-2.62 2.5-4.5c0-1.38-1.12-2.5-2.5-2.5z" fill="#1A7FD4" />
          </svg>
        </div>
        <span style={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
          <span style={{ color: "#0D1F3C" }}>Path</span>
          <span style={{ color: "#1A7FD4" }}>finder</span>
        </span>
      </Link>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {token && (
          <>
            <Link to="/dashboard" style={{ fontSize: "0.875rem", color: "#6B8BAE", textDecoration: "none", fontWeight: 500 }}>
              Dashboard
            </Link>
            <Link to="/intake" style={{ fontSize: "0.875rem", color: "#6B8BAE", textDecoration: "none", fontWeight: 500 }}>
              New Intake
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "8px",
                border: "1.5px solid #1A7FD4",
                background: "transparent",
                color: "#1A7FD4",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
