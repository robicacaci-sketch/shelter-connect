import React from "react";
import Dashboard from "../components/Dashboard";

const DashboardPage: React.FC = () => {
  return (
    <main role="main">
      {/* Hero banner */}
      <div style={{
        position: "relative",
        width: "100%",
        height: "200px",
        overflow: "hidden",
        marginBottom: "2rem",
      }}>
        <img
          src="https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1600&q=80"
          alt="New Jersey neighborhood"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 60%",
          }}
        />
        {/* Dark gradient overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, rgba(13,31,60,0.72) 0%, rgba(13,31,60,0.35) 60%, rgba(13,31,60,0.15) 100%)",
        }} />
        {/* Text on top */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 2.5rem",
        }}>
          <h1 style={{ margin: "0 0 0.35rem", color: "#ffffff", fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Individual Dashboard
          </h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.82)", fontSize: "0.92rem", fontWeight: 400, maxWidth: "480px" }}>
            View active individuals and jump into their housing readiness roadmaps.
          </p>
        </div>
      </div>

      {/* Dashboard content */}
      <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.5rem 3rem" }}>
        <Dashboard />
      </div>
    </main>
  );
};

export default DashboardPage;

