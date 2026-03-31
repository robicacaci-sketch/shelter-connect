import React from "react";
import LoginForm from "../components/LoginForm";

const LoginPage: React.FC = () => {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem"
      }}
    >
      <section
        aria-labelledby="login-heading"
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "2rem",
          borderRadius: "0.75rem",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
          backgroundColor: "white"
        }}
      >
        <h1
          id="login-heading"
          style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}
        >
          Sign in to Housing Readiness
        </h1>
        <p style={{ marginBottom: "1.5rem", color: "#4b5563" }}>
          Use your organization account to access client dashboards and housing
          readiness roadmaps.
        </p>
        <LoginForm />
      </section>
    </main>
  );
};

export default LoginPage;
