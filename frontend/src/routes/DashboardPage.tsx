import React from "react";
import Dashboard from "../components/Dashboard";

const DashboardPage: React.FC = () => {
  return (
    <main className="page" role="main">
      <header className="page__header">
        <h1>Individual dashboard</h1>
        <p className="page__subtitle">
          View active individuals and jump into their housing readiness roadmaps.
        </p>
      </header>
      <Dashboard />
    </main>
  );
};

export default DashboardPage;

