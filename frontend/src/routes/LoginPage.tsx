import React from "react";
import LoginForm from "../components/LoginForm";

const LoginPage: React.FC = () => {
  return (
    <div style={{ minHeight: "calc(100vh - 60px)", background: "#F4F9FF", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Hero section */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem 1.5rem",
        gap: "4rem",
        maxWidth: "1000px",
        margin: "0 auto",
        width: "100%",
      }}>
        {/* Left: copy — with photo background */}
        <div style={{
          flex: 1,
          maxWidth: "440px",
          position: "relative",
          borderRadius: "20px",
          overflow: "hidden",
          minHeight: "320px",
          display: "flex",
          alignItems: "center",
        }}>
          {/* Background photo */}
          <img
            src="https://images.unsplash.com/photo-1449844908441-8829872d2607?w=900&q=80"
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
          {/* Dark overlay for readability */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(13,31,60,0.78) 0%, rgba(26,127,212,0.55) 100%)",
          }} />
          {/* Content on top */}
          <div style={{ position: "relative", zIndex: 1, padding: "2.5rem" }}>
            <h1 style={{ margin: "0 0 1rem", fontSize: "2.4rem", fontWeight: 800, color: "#ffffff", lineHeight: 1.2 }}>
              Every individual deserves<br />a clear path home.
            </h1>
            <p style={{ margin: "0 0 2rem", fontSize: "1rem", color: "rgba(255,255,255,0.82)", lineHeight: 1.7 }}>
              Pathfinder turns a shelter intake into a personalized, step-by-step housing roadmap — automatically.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {[
                { emoji: "📋", text: "AI-generated roadmaps" },
                { emoji: "🏛️", text: "NJ-specific resources" },
                { emoji: "✅", text: "100% free to use" },
              ].map(({ emoji, text }) => (
                <div key={text} style={{
                  padding: "0.5rem 1rem", borderRadius: "999px",
                  background: "rgba(255,255,255,0.18)", color: "#ffffff",
                  fontSize: "0.82rem", fontWeight: 600,
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}>
                  {emoji} {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: login card */}
        <div style={{
          background: "#FFFFFF",
          borderRadius: "20px",
          border: "1px solid #DDEAF7",
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: "360px",
          boxShadow: "0 8px 32px rgba(26,127,212,0.1)",
        }}>
          <LoginForm />
        </div>
      </div>

      {/* Feature row below hero */}
      <div style={{
        borderTop: "1px solid #DDEAF7",
        background: "#FFFFFF",
        padding: "2rem 1.5rem",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1.5rem",
        maxWidth: "1000px",
        margin: "0 auto",
        width: "100%",
      }}>
        {[
          { icon: "🧭", title: "Personalized roadmaps", desc: "Every individual gets a step-by-step plan built around their specific situation and documents." },
          { icon: "🏛️", title: "NJ-specific resources", desc: "Pre-loaded with New Jersey housing agencies, contacts, and program eligibility rules." },
          { icon: "📊", title: "Track progress", desc: "Mark steps complete, add case notes, and monitor every individual's journey in one place." },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{ padding: "1.5rem", background: "#F4F9FF", borderRadius: "16px", border: "1px solid #DDEAF7" }}>
            <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>{icon}</div>
            <p style={{ margin: "0 0 0.4rem", fontWeight: 700, color: "#0D1F3C", fontSize: "0.95rem" }}>{title}</p>
            <p style={{ margin: 0, color: "#6B8BAE", fontSize: "0.82rem", lineHeight: 1.6 }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoginPage;
